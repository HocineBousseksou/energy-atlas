import type { AnomalyExplanationResponse } from "@/lib/schemas/anomaly";

/**
 * T2 — Synthetic forge captured from a real run
 * (2026-05-07 ~01:22). Paris (75), 2024, agriculture, fabricated
 * Z-score 99 / value 50 TWh / YoY +1200 % — physically impossible
 * (national agriculture total ≈ 45 TWh).
 *
 * The model received the impossible body and responded with two
 * meta-hypotheses REBUTTING the input via INSEE-cited counter-evidence,
 * confidence 'élevé' on both — the demo moment that
 * proves the citation-or-nothing guardrail behaves correctly under
 * adversarial input.
 *
 * Source: gemini-2.5-flash + google_search, 20.9 s round-trip,
 * 11 citations resolved via resolveRedirect().
 *
 * DO NOT EDIT manually — re-capture from a live call if the prompt
 * or schema changes.
 */
export const PARIS_AGRI_FORGE_FIXTURE = {
  "hypotheses": [
    {
      "claim": "La valeur observée de 50 000 TWh pour la consommation énergétique du secteur agricole à Paris en 2024 est incompatible avec les données nationales et régionales, suggérant une anomalie de données ou une erreur de classification.",
      "evidence": "La consommation finale d'énergie du secteur agricole pour l'ensemble de la France était d'environ 49 à 52,1 TWh en 2021 et 45 TWh en 2024 pour les énergies directes. La consommation d'énergie primaire pour l'agriculture en Île-de-France est estimée à environ 0,0027 TWh par an. La valeur observée pour Paris est des ordres de grandeur supérieurs à ces chiffres, et dépasse même la consommation finale totale d'énergie de la France (environ 1500-1600 TWh en 2023-2024).",
      "confidence": "élevé",
      "source_keywords": [
        "consommation énergie agriculture France",
        "consommation énergie agriculture Île-de-France",
        "bilan énergétique France"
      ]
    },
    {
      "claim": "Le profil urbain et résidentiel-dominant de Paris, ainsi que la nature des projets d'agriculture urbaine documentés, ne permettent pas d'expliquer une consommation énergétique agricole d'une telle ampleur.",
      "evidence": "Paris est un département fortement urbanisé avec un profil résidentiel-dominant [contexte utilisateur]. Les initiatives d'agriculture urbaine à Paris, telles que les 'Parisculteurs', visent à développer des fermes sur toits ou des jardins partagés, souvent avec un objectif de durabilité et de réduction de l'empreinte énergétique. Ces projets sont de petite échelle (par exemple, 833 m² pour la Ferme du Rail) et ne peuvent en aucun cas justifier une consommation de 50 000 TWh.",
      "confidence": "élevé",
      "source_keywords": [
        "agriculture urbaine Paris",
        "Parisculteurs",
        "consommation énergie agriculture urbaine"
      ]
    }
  ],
  "methodological_note": "Les hypothèses proposées sont basées sur la comparaison de la valeur anormale avec des statistiques officielles et des informations contextuelles vérifiables. Il est crucial de rappeler que corrélation n'implique pas causalité, et qu'une anomalie statistique peut résulter d'une erreur de saisie ou de méthodologie de collecte des données.",
  "citations": [
    {
      "uri": "https://entreprises.selectra.info/energie/profils/agriculteur/consommation-electricite-exploitation-agricole",
      "title": "selectra.info"
    },
    {
      "uri": "https://www.connaissancedesenergies.org/fiche-pedagogique/energie-et-agriculture-en-france",
      "title": "connaissancedesenergies.org"
    },
    {
      "uri": "https://www.insee.fr/fr/statistiques/7728851?sommaire=7728903",
      "title": "insee.fr"
    },
    {
      "uri": "https://www.reussir.fr/grandes-cultures/energie-331-420-kwh-consommes-par-exploitation-et-par",
      "title": "reussir.fr"
    },
    {
      "uri": "https://territoiresfertiles.fr/diagnostics/ile-de-france/indicateurs/energie",
      "title": "territoiresfertiles.fr"
    },
    {
      "uri": "https://www.retm.fr/les-energies/les-enjeux/production",
      "title": "retm.fr"
    },
    {
      "uri": "https://www.statistiques.developpement-durable.gouv.fr/bilan-energetique-de-la-france-pour-2024",
      "title": "developpement-durable.gouv.fr"
    },
    {
      "uri": "https://www.lemondedelenergie.com/europacity-paris-une-capitale-de-plus-en-plus-agricole/2018/08/14/",
      "title": "lemondedelenergie.com"
    },
    {
      "uri": "https://www.scoping.fr/projet/construction-dun-batiment-dagriculture-urbaine-la-ferme-du-rail/",
      "title": "scoping.fr"
    },
    {
      "uri": "https://blog.veritable-potager.fr/agriculture-urbaine-les-projets-verts-de-paris/",
      "title": "veritable-potager.fr"
    },
    {
      "uri": "https://vergersurbains.org/parisculteurs-quelle-agriculture-pour-paris/",
      "title": "vergersurbains.org"
    }
  ]
} as const satisfies AnomalyExplanationResponse;
