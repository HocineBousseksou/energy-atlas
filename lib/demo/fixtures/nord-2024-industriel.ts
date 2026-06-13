import type { AnomalyExplanationResponse } from "@/lib/schemas/anomaly";

/**
 * T1 — Real anomaly explanation captured from a live run
 * (2026-05-07 ~01:21). Nord (59), 2024, industrie, Z-score 4.27,
 * value 21.32 TWh, YoY -22.1 %.
 *
 * Source: POST /api/explain-anomaly with the dept context, against
 * gemini-2.5-flash + google_search grounding, 37.6 s round-trip,
 * resolveRedirect() applied to all 16 citations.
 *
 * DO NOT EDIT manually — re-capture from a live call if the prompt
 * or schema changes.
 */
export const NORD_2024_INDUSTRIEL_FIXTURE = {
  "hypotheses": [
    {
      "claim": "Des fermetures d'usines et des réductions significatives d'activité dans des secteurs industriels clés et énergivores du département du Nord ont entraîné une baisse notable de la consommation énergétique.",
      "evidence": "ArcelorMittal a envisagé la fermeture de son site industriel de Denain (Nord) en novembre 2024. En mars 2023, Nestlé et Tereos ont annoncé la fermeture d'usines dans le Cambrésis (Nord), impactant l'industrie agroalimentaire, un secteur énergivore dans la région. La région Hauts-de-France a enregistré 9 fermetures nettes de sites industriels en 2023 et un solde négatif d'ouvertures/fermetures en 2025, poursuivant une tendance observée depuis 2022.",
      "confidence": "élevé",
      "source_keywords": [
        "fermeture usine",
        "réduction activité",
        "industrie Nord",
        "ArcelorMittal Denain",
        "Nestlé Cambrésis",
        "Tereos Cambrésis",
        "Hauts-de-France"
      ]
    },
    {
      "claim": "Les efforts d'efficacité énergétique et de sobriété, initiés par les industries du Nord en réponse à la crise des prix de l'énergie de 2022-2023, ont eu un impact durable sur la consommation en 2024.",
      "evidence": "La consommation brute d'énergie dans l'industrie française a continué de diminuer en 2024 (-2% après -5% en 2023), et la facture énergétique industrielle a baissé de 24% en 2024, bien que restant supérieure à 2019. La région Hauts-de-France, avec ses secteurs industriels très énergivores (métallurgie, agroalimentaire, chimie, verre), a été particulièrement exposée aux hausses de prix et a mis en œuvre des mesures de sobriété.",
      "confidence": "élevé",
      "source_keywords": [
        "efficacité énergétique",
        "sobriété énergétique",
        "crise énergie",
        "industrie énergivore",
        "Hauts-de-France",
        "prix énergie"
      ]
    },
    {
      "claim": "Un ralentissement général de la production industrielle dans le département du Nord, potentiellement plus marqué que la moyenne nationale, a contribué à la diminution de la demande énergétique.",
      "evidence": "Bien que la production manufacturière nationale ait montré des hausses sur certains mois en 2024, la dynamique de réindustrialisation a ralenti à l'échelle nationale en 2024. Le Baromètre industriel de l'État pour les Hauts-de-France indique un solde négatif d'ouvertures et d'extensions d'usines depuis 2022. Une partie de la réduction des émissions industrielles en 2024 est attribuée à une baisse de la production.",
      "confidence": "modéré",
      "source_keywords": [
        "production industrielle",
        "ralentissement économique",
        "désindustrialisation",
        "Hauts-de-France"
      ]
    }
  ],
  "methodological_note": "Les hypothèses proposées sont basées sur des corrélations observées entre les données d'anomalie et les informations issues de sources publiques fiables. Il est important de rappeler que corrélation n'implique pas causalité.",
  "citations": [
    {
      "uri": "https://www.youtube.com/watch?v=E0rVtiA5sPQ",
      "title": "youtube.com"
    },
    {
      "uri": "https://www.economiematin.fr/industrie-arcelormittal-fermeture-usine-emploi",
      "title": "economiematin.fr"
    },
    {
      "uri": "https://questions.assemblee-nationale.fr/q16/16-648QG.htm",
      "title": "assemblee-nationale.fr"
    },
    {
      "uri": "https://www.insee.fr/fr/statistiques/6797463",
      "title": "insee.fr"
    },
    {
      "uri": "https://www.lejournaldesentreprises.com/breve/les-hauts-de-france-ont-enregistre-9-fermetures-nettes-de-sites-industriels-en-2023-2108427",
      "title": "lejournaldesentreprises.com"
    },
    {
      "uri": "https://www.nord.gouv.fr/Actualites/Actualites/Barometre-industriel-de-l-Etat-Hauts-de-France-Mars-2026",
      "title": "nord.gouv.fr"
    },
    {
      "uri": "https://www.insee.fr/fr/statistiques/8739243",
      "title": "insee.fr"
    },
    {
      "uri": "https://www.latribune.fr/article/entreprises-finance/79106454245856/industrie-le-cout-de-l-energie-baisse-mais-reste-bien-plus-eleve-qu-avant-covid",
      "title": "latribune.fr"
    },
    {
      "uri": "https://www.boursorama.com/actualite-economique/actualites/france-la-facture-energetique-des-industriels-a-baisse-en-2024-mais-toujours-50-plus-chere-qu-en-2019-8b182fc7e487cae5b147e5a327ede2a7",
      "title": "boursorama.com"
    },
    {
      "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFomRVnf4six51Bd6jWf01R-kp44T6SvZygLbPqANZh46ugQHxIL2ZZhDbEsUxR3YUj7CTh_aWxBqpPUKlrKmpeoNX8hntXItkPYdrDWRFMCBa8RROwLAO_MCQDTXPjeNdK1Wmx40NUB0Siq9BhVcqAI84K9W2AhN79tRiUm16FFtmVpqUgmSlsi6v5BjS_5Dg-0B0voLZuCkxHooAlY2xZqmKDSFa1AYdZSdqDjes=",
      "title": "rte-france.com"
    },
    {
      "uri": "https://www.ifrap.org/agriculture-et-energie/les-entreprises-industrielles-durablement-penalisees-par-la-crise-energetique",
      "title": "ifrap.org"
    },
    {
      "uri": "https://www.insee.fr/fr/statistiques/8264544",
      "title": "insee.fr"
    },
    {
      "uri": "https://www.banquedesterritoires.fr/ouvertures-de-sites-en-2024-la-reindustrialisation-se-poursuit-mais-ralentit",
      "title": "banquedesterritoires.fr"
    },
    {
      "uri": "https://www.economie.gouv.fr/actualites/reindustrialisation-de-la-france-en-2024-une-dynamique-moderee-mais-perenne",
      "title": "economie.gouv.fr"
    },
    {
      "uri": "https://www.vie-publique.fr/en-bref/297832-reindustrialisation-un-mouvement-qui-ralentit-en-2024",
      "title": "vie-publique.fr"
    },
    {
      "uri": "https://www.citepa.org/les-efforts-engages-par-lindustrie-francaise-restent-encore-trop-partiels-pour-constituer-une-decarbonation-structurelle-et-durable/",
      "title": "citepa.org"
    }
  ]
} as const satisfies AnomalyExplanationResponse;
