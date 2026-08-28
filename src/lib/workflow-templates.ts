// ══════════════════════════════════════════════════════════════
// Workflow Templates — Task generation per case type
// Each template defines tasks with title, description, priority,
// and due date offset (days from case creation)
// ══════════════════════════════════════════════════════════════

export interface WorkflowTaskTemplate {
  title: string
  description: string
  priority: 'basse' | 'normal' | 'haute' | 'urgente'
  dayOffset: number // days from case creation for due date
}

export interface WorkflowTemplate {
  caseType: string
  label: string
  tasks: WorkflowTaskTemplate[]
}

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  civil: {
    caseType: 'civil',
    label: 'Droit civil',
    tasks: [
      { title: 'Récueillir les pièces du dossier', description: 'Rassembler tous les documents nécessaires : pièces d\'identité, contrats, correspondances, preuves matérielles.', priority: 'haute', dayOffset: 0 },
      { title: 'Rédiger l\'assignation', description: 'Préparer l\'acte d\'assignation en respectant les formes légales et les délais de procédure.', priority: 'haute', dayOffset: 3 },
      { title: 'Déposer l\'assignation au greffe', description: 'Effectuer le dépôt au greffe du tribunal compétent et conserver le récépissé de dépôt.', priority: 'urgente', dayOffset: 7 },
      { title: 'Suivre l\'état de la procédure', description: 'Vérifier régulièrement l\'état d\'avancement de la procédure auprès du greffe.', priority: 'normal', dayOffset: 14 },
      { title: 'Préparer les conclusions', description: 'Rédiger les conclusions écrites en réponse aux arguments de la partie adverse.', priority: 'haute', dayOffset: 21 },
      { title: 'Préparer les plaidoiries', description: 'Élaborer la stratégie de plaidoirie et préparer les notes d\'audience.', priority: 'haute', dayOffset: 28 },
      { title: 'Suivre le jugement', description: 'Récupérer le jugement, l\'analyser et informer le client de la décision.', priority: 'normal', dayOffset: 42 },
    ],
  },
  penal: {
    caseType: 'penal',
    label: 'Droit pénal',
    tasks: [
      { title: 'Recueillir la plainte et les pièces', description: 'Rassembler la plainte, le récépissé de dépôt et toutes les pièces justificatives.', priority: 'urgente', dayOffset: 0 },
      { title: 'Analyser le dossier pénal', description: 'Étudier les faits, qualifier les infractions et identifier les charges.', priority: 'haute', dayOffset: 2 },
      { title: 'Déposer les conclusions de défense', description: 'Préparer et déposer les conclusions de la défense auprès du tribunal.', priority: 'urgente', dayOffset: 5 },
      { title: 'Préparer l\'audience', description: 'Préparer les notes d\'audience, convoquer les témoins et organiser la défense.', priority: 'haute', dayOffset: 10 },
      { title: 'Assister à l\'audience', description: 'Représenter le client lors de l\'audience pénale et plaider.', priority: 'urgente', dayOffset: 12 },
      { title: 'Suivre le jugement et les voies de recours', description: 'Analyser le jugement, informer le client et déterminer si un appel est nécessaire.', priority: 'haute', dayOffset: 20 },
    ],
  },
  commercial: {
    caseType: 'commercial',
    label: 'Droit commercial',
    tasks: [
      { title: 'Rassembler les documents commerciaux', description: 'Collecter les contrats commerciaux, factures, bons de commande et correspondances.', priority: 'haute', dayOffset: 0 },
      { title: 'Vérifier les clauses contractuelles', description: 'Analyser les clauses du contrat et identifier les éventuelles violations.', priority: 'haute', dayOffset: 3 },
      { title: 'Tenter une résolution amiable', description: 'Contacter la partie adverse pour tenter une résolution à l\'amiable avant toute action judiciaire.', priority: 'normal', dayOffset: 7 },
      { title: 'Rédiger la mise en demeure', description: 'Préparer et envoyer une mise en demeure formelle à la partie adverse.', priority: 'haute', dayOffset: 10 },
      { title: 'Engager la procédure judiciaire', description: 'Si nécessaire, initier la procédure devant le tribunal compétent.', priority: 'haute', dayOffset: 17 },
      { title: 'Préparer les conclusions commerciales', description: 'Rédiger les conclusions avec les éléments de preuve commerciaux.', priority: 'haute', dayOffset: 25 },
      { title: 'Suivre l\'exécution du jugement', description: 'Veiller à l\'exécution du jugement et aux éventuelles mesures d\'exécution forcée.', priority: 'normal', dayOffset: 40 },
      { title: 'Rédiger le compte-rendu au client', description: 'Préparer un compte-rendu détaillé de l\'affaire et de son issue pour le client.', priority: 'basse', dayOffset: 45 },
    ],
  },
  social: {
    caseType: 'social',
    label: 'Droit social',
    tasks: [
      { title: 'Recueillir les éléments du litige', description: 'Rassembler le contrat de travail, fiches de paie, correspondances et preuves du litige.', priority: 'haute', dayOffset: 0 },
      { title: 'Analyser la situation juridique', description: 'Étudier le droit du travail applicable et évaluer les chances de succès.', priority: 'haute', dayOffset: 3 },
      { title: 'Tenter la conciliation', description: 'Saisir l\'inspection du travail ou tenter une conciliation directe avec l\'employeur.', priority: 'normal', dayOffset: 7 },
      { title: 'Rédiger la requête au conseil de prud\'hommes', description: 'Préparer et déposer la requête auprès du conseil de prud\'hommes.', priority: 'haute', dayOffset: 14 },
      { title: 'Préparer le dossier pour l\'audience de conciliation', description: 'Constituer le dossier complet pour la phase de conciliation obligatoire.', priority: 'haute', dayOffset: 21 },
      { title: 'Préparer les conclusions pour le jugement', description: 'Rédiger les conclusions détaillées si la conciliation a échoué.', priority: 'haute', dayOffset: 35 },
    ],
  },
  administratif: {
    caseType: 'administratif',
    label: 'Droit administratif',
    tasks: [
      { title: 'Rassembler les pièces administratives', description: 'Collecter les décisions administratives, arrêtés, courriers et pièces justificatives.', priority: 'haute', dayOffset: 0 },
      { title: 'Vérifier les délais de recours', description: 'Calculer les délais de recours contentieux à partir de la notification de la décision.', priority: 'urgente', dayOffset: 2 },
      { title: 'Rédiger le recours gracieux', description: 'Préparer et envoyer un recours gracieux à l\'administration avant tout recours contentieux.', priority: 'haute', dayOffset: 5 },
      { title: 'Engager le recours contentieux', description: 'Déposer la requête devant le tribunal administratif compétent.', priority: 'haute', dayOffset: 15 },
      { title: 'Préparer les conclusions', description: 'Rédiger les conclusions en droit administratif avec les moyens de légalité.', priority: 'haute', dayOffset: 25 },
      { title: 'Suivre le jugement administratif', description: 'Analyser le jugement et informer le client des voies de recours possibles.', priority: 'normal', dayOffset: 40 },
    ],
  },
}

/** Get the workflow template for a given case type */
export function getWorkflowTemplate(caseType: string): WorkflowTemplate | null {
  return WORKFLOW_TEMPLATES[caseType] || null
}

/** Get all available workflow template types */
export function getWorkflowTypes(): Array<{ value: string; label: string; taskCount: number }> {
  return Object.values(WORKFLOW_TEMPLATES).map(t => ({
    value: t.caseType,
    label: t.label,
    taskCount: t.tasks.length,
  }))
}
