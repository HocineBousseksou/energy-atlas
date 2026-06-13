/**
 * Demo-mode fixture for /api/chat.
 *
 * One pre-recorded assistant turn used by the streamed mock. The text
 * is sober and factual, in the dashboard's tone, and references the
 * data layer the user already has access to. No fabricated figures.
 *
 * Updated when the chat system prompt changes.
 */
export const CHAT_DEMO_REPLY = `D'après les filtres en cours, la consommation totale française en 2024 s'élève à environ 769,84 TWh. Le Nord est le département le plus consommateur (40,84 TWh), Mayotte le moins consommateur (≈0,4 TWh).

En per-capita, le classement change radicalement : Mayotte n'est plus dernière. Cela illustre pourquoi le toggle "Par habitant" est l'outil pédagogique central du tableau de bord — un département peu peuplé peut consommer peu en absolu mais beaucoup par habitant, et inversement.

Pour creuser un département précis, cliquez-le sur la carte ou dans le Top 15 ; le comparateur s'active au second clic. La couche IA explicable produit alors une analyse sourcée des anomalies, avec note méthodologique rappelant que corrélation n'implique pas causalité.

Mode démo actif : cette réponse est pré-enregistrée. Désactivez DEMO_MODE pour interroger le LLM en direct.`;
