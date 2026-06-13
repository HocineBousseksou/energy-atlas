"""
Energy Atlas — Static Data Pipeline
====================================

Pre-computes all derived datasets for the dashboard:
- departments.json: per-(year, dept) consumption + per-capita normalization
- geojson.json: 101 features keyed by department code
- anomalies.json: scores for Z-score / IQR / Isolation Forest across threshold grids
- clusters.json: K-means assignments + cluster centroids (per-capita normalized)
- predictions.json: linear regression 2025 forecasts per dept × sector + 95% CI

Also generates lib/data.types.ts so TypeScript stays in sync.

Run:
    python prepare_data.py            # full pipeline
    python prepare_data.py --verify   # full pipeline + post-checks
    python prepare_data.py --verify-only   # just check existing JSONs

Reproducibility: random_state=42 everywhere.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).parent
EXCEL_PATH = ROOT / "donne_es2026.xlsx"
INSEE_PATH = ROOT / "insee_population_departements.csv"
OUT_DIR = ROOT
TYPES_OUT = ROOT.parent / "lib" / "data.types.ts"

SECTORS = ["agriculture", "industrie", "résidentiel", "tertiaire", "autre"]
ENERGIES = ["Totale", "Électricité", "Gaz"]
ENERGY_PREFIX = {
    "Totale": "Consommation",
    "Électricité": "Consommation électricité",
    "Gaz": "Consommation gaz",
}

# Threshold grids — keep tight enough to bound JSON size
ZSCORE_THRESHOLDS = np.round(np.arange(1.0, 5.1, 0.1), 2).tolist()
IQR_MULTIPLIERS = np.round(np.arange(1.0, 3.1, 0.1), 2).tolist()
IFOREST_CONTAMINATIONS = np.round(np.arange(0.01, 0.21, 0.01), 3).tolist()

RANDOM_STATE = 42


# =============================================================================
# 1. LOAD + CLEAN
# =============================================================================

def load_source() -> pd.DataFrame:
    if not EXCEL_PATH.exists():
        sys.exit(f"❌ Source Excel missing: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH)
    df["Code département"] = df["Code département"].astype(str).str.strip()

    numeric_cols = [c for c in df.columns if "Consommation" in c]
    for c in numeric_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    coords = df["Géo-point département"].astype(str).str.split(",", expand=True)
    df["lat"] = pd.to_numeric(coords[0], errors="coerce")
    df["lon"] = pd.to_numeric(coords[1], errors="coerce")
    return df


def load_insee_population() -> pd.DataFrame:
    """Load INSEE population per department.

    Expected CSV format (semicolon-separated):
        Code département;Population
        01;652432
        02;531345
        ...

    If the official CSV has a different schema, adapt here. For DOM-TOM use
    the most recent INSEE estimate.
    """
    if not INSEE_PATH.exists():
        print(f"⚠️  INSEE CSV missing at {INSEE_PATH}", file=sys.stderr)
        print("   Falling back to embedded estimates (less precise).", file=sys.stderr)
        return _fallback_insee_population()

    pop = pd.read_csv(INSEE_PATH, sep=";", encoding="utf-8")
    pop.columns = [c.strip() for c in pop.columns]
    pop["Code département"] = pop["Code département"].astype(str).str.strip().str.zfill(2)
    pop = pop.rename(columns={"Population": "population"})
    return pop[["Code département", "population"]]


def _fallback_insee_population() -> pd.DataFrame:
    """Minimal hardcoded INSEE 2024 estimates so the pipeline doesn't break.

    Only used if the real INSEE CSV is missing. Replace with the official file.
    Source: insee.fr Estimations de population 2024.
    """
    data = {
        "01": 660272, "02": 526050, "03": 332155, "04": 167500, "05": 141756,
        "06": 1094579, "07": 326872, "08": 263538, "09": 153153, "10": 312376,
        "11": 374714, "12": 280028, "13": 2043110, "14": 700853, "15": 144684,
        "16": 348180, "17": 651358, "18": 296404, "19": 240073, "21": 533819,
        "22": 605523, "23": 116451, "24": 412082, "25": 543974, "26": 519436,
        "27": 612442, "28": 433129, "29": 920820, "30": 758251, "31": 1418085,
        "32": 192335, "33": 1654817, "34": 1182952, "35": 1109504, "36": 218443,
        "37": 612061, "38": 1273034, "39": 257624, "40": 419902, "41": 330550,
        "42": 765634, "43": 226980, "44": 1453620, "45": 686691, "46": 174208,
        "47": 333417, "48": 76601, "49": 825041, "50": 495045, "51": 561253,
        "52": 170498, "53": 305896, "54": 738587, "55": 184231, "56": 762945,
        "57": 1041128, "58": 200669, "59": 2606234, "60": 826951, "61": 277629,
        "62": 1462807, "63": 660915, "64": 690064, "65": 226839, "66": 481980,
        "67": 1146896, "68": 769105, "69": 1875747, "70": 233547, "71": 549096,
        "72": 568941, "73": 437725, "74": 833728, "75": 2102650, "76": 1245366,
        "77": 1438520, "78": 1462265, "79": 374029, "80": 568842, "81": 391273,
        "82": 268390, "83": 1100199, "84": 568998, "85": 700039, "86": 437390,
        "87": 369979, "88": 360674, "89": 333478, "90": 140145, "91": 1313584,
        "92": 1641220, "93": 1660765, "94": 1426305, "95": 1252933,
        "971": 374775, "972": 358749, "973": 295385, "974": 877976, "976": 320901,
        "2A": 158507, "2B": 187730,
    }
    return pd.DataFrame(
        [{"Code département": k, "population": v} for k, v in data.items()]
    )


# =============================================================================
# 2. EMIT departments.json
# =============================================================================

def build_departments_json(df: pd.DataFrame, pop: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    merged = df.merge(pop, on="Code département", how="left")
    if merged["population"].isna().any():
        missing = merged.loc[merged["population"].isna(), "Code département"].unique().tolist()
        print(f"⚠️  Missing INSEE pop for: {missing}", file=sys.stderr)
        merged["population"] = merged["population"].fillna(0)

    for _, r in merged.iterrows():
        consumption_by_energy: dict[str, dict[str, float]] = {}
        for energy in ENERGIES:
            prefix = ENERGY_PREFIX[energy]
            sectors_dict = {}
            for s in SECTORS:
                col = f"{prefix} {s} (MWh)"
                sectors_dict[s] = float(r.get(col, 0.0))
            sectors_dict["totale"] = float(r.get(f"{prefix} totale (MWh)", 0.0))
            consumption_by_energy[energy] = sectors_dict

        rows.append({
            "year": int(r["Année"]),
            "code": str(r["Code département"]),
            "name": str(r["Libellé département"]),
            "region": str(r["Libellé région"]),
            "lat": float(r["lat"]) if pd.notna(r["lat"]) else None,
            "lon": float(r["lon"]) if pd.notna(r["lon"]) else None,
            "population": int(r["population"]) if r["population"] > 0 else None,
            "consumption": consumption_by_energy,
        })
    return rows


# =============================================================================
# 3. GEOJSON FeatureCollection
# =============================================================================

def build_geojson(df: pd.DataFrame) -> dict[str, Any]:
    features = []
    seen: set[str] = set()
    for _, row in df.iterrows():
        code = row["Code département"]
        if code in seen:
            continue
        seen.add(code)
        try:
            geom = json.loads(row["Géo-shape département"])
        except (json.JSONDecodeError, TypeError):
            continue
        features.append({
            "type": "Feature",
            "id": code,
            "properties": {
                "code": code,
                "name": row["Libellé département"],
                "region": row["Libellé région"],
            },
            "geometry": geom,
        })
    return {"type": "FeatureCollection", "features": features}


# =============================================================================
# 4. ANOMALIES (Z-score / IQR / Isolation Forest)
# =============================================================================

def compute_anomalies(df: pd.DataFrame) -> dict[str, Any]:
    out: dict[str, Any] = {"zscore": {}, "iqr": {}, "iforest": {}}

    years = sorted(df["Année"].unique())

    for year in years:
        sub_year = df[df["Année"] == year].copy()

        for energy in ENERGIES:
            prefix = ENERGY_PREFIX[energy]
            sectors_to_iter = SECTORS + ["totale"]

            for sector in sectors_to_iter:
                col = f"{prefix} {sector} (MWh)"
                if col not in sub_year.columns:
                    continue
                vals = sub_year[col].values

                # Z-score
                mu, sigma = vals.mean(), vals.std(ddof=0)
                if sigma > 0:
                    z = (vals - mu) / sigma
                    key = f"{year}|{energy}|{sector}"
                    out["zscore"][key] = {
                        "codes": sub_year["Code département"].tolist(),
                        "scores": [float(s) for s in z.tolist()],
                    }

                # IQR
                q1, q3 = np.percentile(vals, 25), np.percentile(vals, 75)
                iqr = q3 - q1
                if iqr > 0:
                    above = (vals - q3) / iqr
                    below = (q1 - vals) / iqr
                    excess = np.where(vals > q3, above, np.where(vals < q1, below, 0.0))
                    key = f"{year}|{energy}|{sector}"
                    out["iqr"][key] = {
                        "codes": sub_year["Code département"].tolist(),
                        "q1": float(q1),
                        "q3": float(q3),
                        "iqr": float(iqr),
                        "excess": [float(s) for s in excess.tolist()],
                    }

            # Isolation Forest is multidimensional → fit on the 5 sector cols
            feat_cols = [f"{prefix} {s} (MWh)" for s in SECTORS]
            X = sub_year[feat_cols].values
            scaler = StandardScaler()
            Xs = scaler.fit_transform(X)
            try:
                iso = IsolationForest(
                    contamination=0.1,  # base contamination; threshold filtering happens client-side
                    random_state=RANDOM_STATE,
                    n_estimators=100,
                )
                iso.fit(Xs)
                scores = -iso.score_samples(Xs)  # higher = more anomalous
                key = f"{year}|{energy}"
                out["iforest"][key] = {
                    "codes": sub_year["Code département"].tolist(),
                    "scores": [float(s) for s in scores.tolist()],
                }
            except Exception as e:  # pragma: no cover
                print(f"⚠️  IForest failed for {year}|{energy}: {e}", file=sys.stderr)

    out["thresholds"] = {
        "zscore": ZSCORE_THRESHOLDS,
        "iqr": IQR_MULTIPLIERS,
        "iforest": IFOREST_CONTAMINATIONS,
    }
    return out


# =============================================================================
# 5. CLUSTERING (per-capita normalized, K-means with silhouette-chosen k)
# =============================================================================

def compute_clusters(df: pd.DataFrame, pop: pd.DataFrame) -> dict[str, Any]:
    # Use most recent year for clustering signature
    latest_year = int(df["Année"].max())
    latest = df[df["Année"] == latest_year].copy()
    latest = latest.merge(pop, on="Code département", how="left")
    latest = latest[latest["population"].fillna(0) > 0].copy()

    feat_cols = [f"Consommation {s} (MWh)" for s in SECTORS]
    X = latest[feat_cols].values
    pop_vec = latest["population"].values.reshape(-1, 1)
    X_per_capita = X / pop_vec  # MWh per inhabitant per sector

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X_per_capita)

    best_k, best_score = 4, -1.0
    for k in range(2, 9):
        km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
        labels = km.fit_predict(Xs)
        try:
            score = silhouette_score(Xs, labels)
        except ValueError:
            continue
        if score > best_score:
            best_score = float(score)
            best_k = k

    km = KMeans(n_clusters=best_k, random_state=RANDOM_STATE, n_init=10)
    labels = km.fit_predict(Xs)

    # Build cluster summaries
    centroids_real = scaler.inverse_transform(km.cluster_centers_)
    cluster_descriptions = []
    for c in range(best_k):
        mean_vec = centroids_real[c]
        # rank sectors by share within cluster
        share = mean_vec / mean_vec.sum() if mean_vec.sum() > 0 else mean_vec
        dominant = SECTORS[int(np.argmax(share))]
        cluster_descriptions.append({
            "id": int(c),
            "label": f"Profil {dominant}-dominant",
            "dominant_sector": dominant,
            "size": int(np.sum(labels == c)),
            "centroid_per_capita": [float(v) for v in mean_vec.tolist()],
        })

    assignments = []
    for code, label in zip(latest["Code département"].tolist(), labels):
        assignments.append({"code": str(code), "cluster": int(label)})

    return {
        "year_used": latest_year,
        "k_chosen": int(best_k),
        "silhouette_score": float(best_score),
        "method": "kmeans on per-capita-normalized sector vectors, k via silhouette 2-8",
        "feature_columns": SECTORS,
        "clusters": cluster_descriptions,
        "assignments": assignments,
    }


# =============================================================================
# 6. PREDICTIONS 2025 (linear regression with 95% CI via bootstrap)
# =============================================================================

def compute_predictions(df: pd.DataFrame) -> dict[str, Any]:
    """Linear regression 2022→2024 → 2025 with bootstrap-based 95% CI.

    NOTE: 3 years is too few for robust prediction. We expose this explicitly
    via the wide CI and the methodological note in the UI. This is a SIGNAL of
    rigor, not a limitation to hide.
    """
    out: list[dict[str, Any]] = []
    rng = np.random.default_rng(RANDOM_STATE)

    for code in sorted(df["Code département"].unique()):
        dept_rows = df[df["Code département"] == code].sort_values("Année")
        if len(dept_rows) < 3:
            continue
        years = dept_rows["Année"].values.reshape(-1, 1)

        for sector in SECTORS + ["totale"]:
            col = f"Consommation {sector} (MWh)"
            if col not in dept_rows.columns:
                continue
            y = dept_rows[col].values
            if (y == 0).all():
                continue

            model = LinearRegression()
            model.fit(years, y)
            point_pred = float(model.predict([[2025]])[0])

            # Bootstrap CI
            preds = []
            for _ in range(500):
                idx = rng.integers(0, len(y), len(y))
                if len(np.unique(years[idx])) < 2:
                    continue
                m = LinearRegression()
                m.fit(years[idx], y[idx])
                preds.append(float(m.predict([[2025]])[0]))
            if preds:
                ci_low = float(np.percentile(preds, 2.5))
                ci_high = float(np.percentile(preds, 97.5))
            else:
                ci_low, ci_high = point_pred, point_pred

            out.append({
                "code": str(code),
                "sector": sector,
                "year": 2025,
                "point": max(0.0, point_pred),
                "ci_low": max(0.0, ci_low),
                "ci_high": max(0.0, ci_high),
            })

    return {
        "method": "OLS linear regression 2022-2024 + bootstrap 95% CI (500 samples)",
        "warning": "3-year history is statistically thin; CI bands intentionally wide.",
        "predictions": out,
    }


# =============================================================================
# 7. TYPES TS
# =============================================================================

TS_TEMPLATE = """// Auto-generated by data/prepare_data.py — do not edit.
// Regenerate via: cd data && python prepare_data.py

export type Energy = "Totale" | "Électricité" | "Gaz";
export type Sector =
  | "agriculture" | "industrie" | "résidentiel" | "tertiaire" | "autre" | "totale";

export interface Department {
  year: number;
  code: string;
  name: string;
  region: string;
  lat: number | null;
  lon: number | null;
  population: number | null;
  consumption: Record<Energy, Record<Sector, number>>;
}

export interface AnomalyZScoreEntry {
  codes: string[];
  scores: number[];
}

export interface AnomalyIQREntry {
  codes: string[];
  q1: number;
  q3: number;
  iqr: number;
  excess: number[];
}

export interface AnomalyIForestEntry {
  codes: string[];
  scores: number[];
}

export interface AnomalyDataset {
  zscore: Record<string, AnomalyZScoreEntry>;
  iqr: Record<string, AnomalyIQREntry>;
  iforest: Record<string, AnomalyIForestEntry>;
  thresholds: {
    zscore: number[];
    iqr: number[];
    iforest: number[];
  };
}

export interface ClusterDescription {
  id: number;
  label: string;
  dominant_sector: string;
  size: number;
  centroid_per_capita: number[];
}

export interface ClusterAssignment {
  code: string;
  cluster: number;
}

export interface ClustersDataset {
  year_used: number;
  k_chosen: number;
  silhouette_score: number;
  method: string;
  feature_columns: string[];
  clusters: ClusterDescription[];
  assignments: ClusterAssignment[];
}

export interface Prediction {
  code: string;
  sector: string;
  year: number;
  point: number;
  ci_low: number;
  ci_high: number;
}

export interface PredictionsDataset {
  method: string;
  warning: string;
  predictions: Prediction[];
}
"""


def emit_types() -> None:
    TYPES_OUT.parent.mkdir(parents=True, exist_ok=True)
    TYPES_OUT.write_text(TS_TEMPLATE, encoding="utf-8")


# =============================================================================
# 8. ORCHESTRATION
# =============================================================================

def write_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def verify_outputs() -> bool:
    expected = {
        "departments.json": ("rows count", lambda obj: len(obj)),
        "geojson.json":     ("features", lambda obj: len(obj.get("features", []))),
        "anomalies.json":   ("z-score keys", lambda obj: len(obj.get("zscore", {}))),
        "clusters.json":    ("k_chosen", lambda obj: obj.get("k_chosen")),
        "predictions.json": ("predictions", lambda obj: len(obj.get("predictions", []))),
    }
    all_good = True
    for fname, (label, fn) in expected.items():
        path = OUT_DIR / fname
        if not path.exists():
            print(f"❌ {fname}: missing"); all_good = False; continue
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
            print(f"✓ {fname} — {label}: {fn(obj)} ({path.stat().st_size // 1024} KB)")
        except Exception as e:
            print(f"❌ {fname}: malformed ({e})"); all_good = False
    return all_good


def main() -> int:
    parser = argparse.ArgumentParser(description="Energy Atlas data pipeline")
    parser.add_argument("--verify", action="store_true", help="Run pipeline + verify outputs")
    parser.add_argument("--verify-only", action="store_true", help="Skip pipeline, only verify")
    args = parser.parse_args()

    if args.verify_only:
        return 0 if verify_outputs() else 1

    print("📦 Loading source...")
    df = load_source()
    pop = load_insee_population()

    print(f"   {len(df)} rows × {len(df.columns)} cols")
    print(f"   {pop.shape[0]} INSEE population records")

    print("🏗️  Building departments.json...")
    write_json(OUT_DIR / "departments.json", build_departments_json(df, pop))

    print("🗺️  Building geojson.json...")
    write_json(OUT_DIR / "geojson.json", build_geojson(df))

    print("🚨 Computing anomalies...")
    write_json(OUT_DIR / "anomalies.json", compute_anomalies(df))

    print("🏷️  Clustering departments...")
    write_json(OUT_DIR / "clusters.json", compute_clusters(df, pop))

    print("🔮 Computing 2025 predictions...")
    write_json(OUT_DIR / "predictions.json", compute_predictions(df))

    print("📐 Emitting TypeScript types...")
    emit_types()

    print("\n✅ Pipeline done.\n")

    if args.verify:
        return 0 if verify_outputs() else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
