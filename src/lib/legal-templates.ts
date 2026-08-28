/**
 * Built-in Cameroonian legal document templates.
 * Used to seed the DocumentTemplate table for new tenants.
 * Placeholders use {{variable}} syntax, auto-populated by the generation API.
 */

export interface LegalTemplateSeed {
  name: string
  category: string
  description: string
  content: string
  variables: string[]
}

export const LEGAL_TEMPLATES: LegalTemplateSeed[] = [
  {
    name: 'Conclusions (Civil)',
    category: 'conclusion',
    description: 'Conclusions récapitulatives pour dossier civil devant le TPI',
    variables: ['case_reference', 'case_title', 'client_name', 'client_company', 'adversary', 'jurisdiction', 'amount', 'date', 'tenant_name', 'client_email', 'client_phone', 'arguments_factuels', 'arguments_juridiques', 'demandes'],
    content: `**TRIBUNAL DE PREMIÈRE INSTANCE DE {{jurisdiction}}**

**AFFAIRE N° {{case_reference}}**

{{client_name}}{{client_company ? ' (' + client_company + ')' : ''}}
Représenté(e) par Maître {{tenant_name}}, Avocat au Barreau du Cameroun

c/ 

{{adversary}}

**OBJET : {{case_title}}**

**CONCLUSIONS**

À l'honneur de Monsieur le Président du Tribunal de Première Instance de {{jurisdiction}},

{{client_name}}{{client_company ? ', agissant en qualité de représentant de ' + client_company + ',' : ''}} demeurant à [adresse], représenté par Me {{tenant_name}}, Avocat au Barreau du Cameroun, a l'honneur d'exposer et conclure comme il suit :

**I. FAITS ET PROCÉDURE**

{{arguments_factuels}}

**II. DISCUSSION**

{{arguments_juridiques}}

**III. PAR CES MOTIFS**

{{demandes}}

Vu les articles 1 et suivants de l'Acte Uniforme OHADA portant organisation des procédures simplifiées de recouvrement et des voies d'exécution,
Vu le Code de Procédure Civile et Commerciale camerounais,
Vu toutes pièces justificatives produites et versées aux débats,

{{client_name}} demande à la Cour de :

1. [Premier chef de demande]
2. [Deuxième chef de demande]
3. [Troisième chef de demande]

Et subsidiairement, à toutes fins utiles.

Fait à {{jurisdiction}}, le {{date}}

**Pour {{client_name}}**

Me {{tenant_name}}
Avocat au Barreau du Cameroun`,
  },
  {
    name: 'Assignation (Civil)',
    category: 'assignation',
    description: 'Assignation en justice pour dossier civil',
    variables: ['case_reference', 'case_title', 'client_name', 'client_company', 'adversary', 'jurisdiction', 'amount', 'date', 'tenant_name', 'client_address', 'adversary_address', 'objet_demande'],
    content: `**RÉPUBLIQUE DU CAMEROUN**
**Paix - Travail - Patrie**

**TRIBUNAL DE PREMIÈRE INSTANCE DE {{jurisdiction}}**

N° R.G. : {{case_reference}}

**ASSIGNATION**

À la requête de :
{{client_name}}{{client_company ? ' (' + client_company + ')' : ''}}
demeurant à : {{client_address}}

Agissant en la qualité de : [qualité]
Représenté par : Me {{tenant_name}}, Avocat

Contre :
{{adversary}}
demeurant à : {{adversary_address}}

**QUI EST ASSIGNÉ(E) DEVANT LE TRIBUNAL DE PREMIÈRE INSTANCE DE {{jurisdiction}}, EN QUALITÉ DE DÉFENDEUR(E), AUX FINS D'AVOIR À :**

**OBJET :**

{{objet_demande}}

**MOTIFS :**

[I. Exposé des faits]

[II. Moyens à développer]

[III. Dispositions invoquées]

**PAR CES MOTIFS, IL EST DEMANDÉ AU TRIBUNAL DE :**

1. Déclarer la demande recevable et bien fondée en toutes ses formes
2. [Condamner le défendeur à...]
3. Condamner {{adversary}} aux dépens de l'instance

Vu le Code de Procédure Civile et Commerciale,
Vu l'Acte Uniforme OHADA,

Fait à {{jurisdiction}}, le {{date}}

**Pour {{client_name}}**

Me {{tenant_name}}`,
  },
  {
    name: 'Requête (Administratif)',
    category: 'autre',
    description: 'Requête introductive d\'instance devant le tribunal administratif',
    variables: ['case_reference', 'case_title', 'client_name', 'client_company', 'adversary', 'jurisdiction', 'date', 'tenant_name', 'client_address', 'decision_attaquée', 'date_decision', 'moyens_annulation'],
    content: `**TRIBUNAL ADMINISTRATIF DE {{jurisdiction}}**

**N° {{case_reference}}**

**REQUÊTE**

À Monsieur le Président du Tribunal Administratif de {{jurisdiction}},

**REQUÉRANT(E) :**
{{client_name}}{{client_company ? ' (' + client_company + ')' : ''}}
demeurant à : {{client_address}}
Représenté par : Me {{tenant_name}}, Avocat

**DÉFENDEUR(E) :**
{{adversary}}
[Adresse de l'administration]

**OBJET :** {{case_title}}

Monsieur le Président,

{{client_name}} a l'honneur de saisir votre juridiction aux fins de voir :

**I. EXPOSÉ DES FAITS**

[Exposer les circonstances de fait]

**II. MOTIFS**

La présente requête est fondée sur les moyens suivants :

{{moyens_annulation}}

**III. DISCUSSION**

La décision attaquée, en date du {{date_decision}}, est entachée des irrégularités suivantes :

1. [Excès de pouvoir]
2. [Violation de la loi]
3. [Procédure irrégulière]

**PAR CES MOTIFS**

{{client_name}} demande au Tribunal Administratif de :

1. Déclarer la requête recevable et bien fondée
2. Annuler la décision attaquée n° {{decision_attaquée}} en date du {{date_decision}}
3. Condamner l'État aux dépens

Fait à {{jurisdiction}}, le {{date}}

**Pour {{client_name}}**

Me {{tenant_name}}`,
  },
  {
    name: 'Mémoire d\'Appel',
    category: 'conclusion',
    description: 'Mémoire d\'appel pour la Cour d\'Appel',
    variables: ['case_reference', 'case_title', 'client_name', 'client_company', 'adversary', 'jurisdiction', 'date', 'tenant_name', 'jugement_attaque', 'date_jugement', 'chef_appel', 'arguments_appel'],
    content: `**COUR D'APPEL DE {{jurisdiction}}**

**N° {{case_reference}}**

**MÉMOIRE D'APPEL**

**APPELANT(E) :**
{{client_name}}{{client_company ? ' (' + client_company + ')' : ''}}
Représenté par : Me {{tenant_name}}, Avocat

**INTIMÉ(E) :**
{{adversary}}

**OBJET :** {{case_title}}

**CONTRE LE JUGEMENT N° {{jugement_attaque}} EN DATE DU {{date_jugement}}**

Monsieur le Premier Président,

{{client_name}} interjette appel du jugement rendu le {{date_jugement}} par le Tribunal de Première Instance de {{jurisdiction}} dans l'affaire l'opposant à {{adversary}}.

**I. FAITS ET PROCÉDURE**

[Exposer les faits et la procédure de première instance]

**II. EXPOSÉ DU JUGEMENT ATTAQUÉ**

Le Tribunal a rendu le jugement dont appel le {{date_jugement}} :

1. [Dispositif du jugement]
2. [Motifs du jugement]

**III. MOYENS D'APPEL**

{{arguments_appel}}

**IV. DISCUSSION**

{{chef_appel}}

**PAR CES MOTIFS**

{{client_name}} demande à la Cour de :

1. Infirmer le jugement attaqué en toutes ses dispositions
2. [Reformuler le dispositif]
3. Condamner l'intimé aux dépens de l'appel

Fait à {{jurisdiction}}, le {{date}}

**Pour {{client_name}}**

Me {{tenant_name}}`,
  },
  {
    name: 'Procuration',
    category: 'autre',
    description: 'Procuration pour représenter un client en justice',
    variables: ['client_name', 'client_company', 'tenant_name', 'date', 'case_reference', 'case_title', 'client_address', 'lieu_signature'],
    content: `**PROCURATION**

Je soussigné(e) **{{client_name}}**{{client_company ? ', ' + client_company + ',' : ''}} demeurant à {{client_address}},

Autorise et donne par la présente procuration à **Me {{tenant_name}}**, Avocat au Barreau du Cameroun, pour :

1. Me représenter dans le dossier **{{case_title}}** (Réf: {{case_reference}}) devant toutes juridictions camerounaises compétentes
2. Signer tous actes de procédure, conclusions, mémoires et requêtes utiles à la défense de mes intérêts
3. Négocier, conclure et signer tout accord transactionnel ou compromis
4. Perception de toutes sommes mises à ma disposition par décision de justice

Cette procuration est valable jusqu'à révocation expresse par écrit.

Fait à {{lieu_signature || '[Lieu]}}, le {{date}}

**Signature du mandant :**

_________________________________

**Reconnue conforme :**

Me {{tenant_name}}`,
  },
]

/**
 * Seed built-in templates for a tenant.
 * Skips templates that already exist (by name + tenantId).
 */
export async function seedLegalTemplates(tenantId: string) {
  const { getDb } = await import('@/lib/db')
  const db = getDb()
  let created = 0

  for (const tpl of LEGAL_TEMPLATES) {
    const existing = await db.documentTemplate.findFirst({
      where: { tenantId, name: tpl.name },
    })
    if (!existing) {
      await db.documentTemplate.create({
        data: {
          name: tpl.name,
          category: tpl.category,
          description: tpl.description,
          content: tpl.content,
          variables: JSON.stringify(tpl.variables),
          tenantId,
        },
      })
      created++
    }
  }

  await db.$disconnect().catch(() => {})
  return created
}
