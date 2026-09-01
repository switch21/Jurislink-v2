'use client'

import React from 'react'
import { QueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Briefcase, Users, ClipboardList, FileText, Calendar, Receipt, TrendingUp, AlertOctagon, Timer, SendHorizontal, FileCode2, MessageSquare, BarChart3, Bell, Shield, Settings, Search, BuildingIcon, CreditCardIcon, UsersRound } from 'lucide-react'
import type { ViewName } from '@/store/appStore'

// ==================== Query Client ====================
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } })

// ==================== Constants ====================
export const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-[#E8F0F8] text-[#1E5A8A]',
  ouvert: 'bg-[#E8F0F8] text-[#1E5A8A]',
  en_cours: 'bg-[#F5F0E3] text-[#926B2D]',
  en_attente: 'bg-[#FEF3C7] text-[#92400E]',
  clos: 'bg-[#D1FAE5] text-[#065F46]',
  archive: 'bg-[#F3F4F6] text-[#6B7280]',
  non_paye: 'bg-[#FEE2E2] text-[#991B1B]',
  partiel: 'bg-[#FEF3C7] text-[#92400E]',
  paye: 'bg-[#D1FAE5] text-[#065F46]',
  annule: 'bg-[#F3F4F6] text-[#6B7280]',
  a_faire: 'bg-[#E8F0F8] text-[#1E5A8A]',
  en_cours_t: 'bg-[#F5F0E3] text-[#926B2D]',
  terminee: 'bg-[#D1FAE5] text-[#065F46]',
  annulee: 'bg-[#F3F4F6] text-[#6B7280]',
  todo: 'bg-[#E8F0F8] text-[#1E5A8A]',
  in_progress: 'bg-[#F5F0E3] text-[#926B2D]',
  done: 'bg-[#D1FAE5] text-[#065F46]',
}
export const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente',
  clos: 'Clos', archive: 'Archivé', non_paye: 'Non payé', partiel: 'Partiel',
  paye: 'Payé', annule: 'Annulé',
  a_faire: 'À faire', en_cours_t: 'En cours', terminee: 'Terminée', annulee: 'Annulée',
  todo: 'À faire', in_progress: 'En cours', done: 'Terminée',
}
export const PRIORITY_COLORS: Record<string, string> = {
  basse: 'bg-[#F3F4F6] text-[#6B7280]',
  normal: 'bg-[#F3F4F6] text-[#374151]',
  haute: 'bg-[#FEF3C7] text-[#92400E]',
  urgente: 'bg-[#FEE2E2] text-[#991B1B]',
}
export const PRIORITY_LABELS: Record<string, string> = { basse: 'Basse', normal: 'Normal', haute: 'Haute', urgente: 'Urgente' }
export const TYPE_LABELS: Record<string, string> = { civil: 'Civil', penal: 'Pénal', commercial: 'Commercial', social: 'Social', administratif: 'Administratif' }
export const EVENT_TYPE_LABELS: Record<string, string> = { audience: 'Audience', rdv: 'Rendez-vous', echeance: 'Échéance', depot: 'Dépôt', autre: 'Autre' }
export const CRIT_COLORS: Record<string, string> = {
  basse: 'bg-[#D1D5DB]', normal: 'bg-[#C8A45D]', haute: 'bg-[#F59E0B]', urgente: 'bg-[#EF4444]',
}
export const ROLE_LABELS: Record<string, string> = {
  root_admin: 'Admin Racine', associate: 'Associé', firm_admin: 'Admin Cabinet',
  lawyer: 'Avocat', jurist: 'Juriste', assistant: 'Assistant', accountant: 'Comptable', client: 'Client', secretary: 'Secrétaire', collaborator: 'Collaborateur',
}
export const RISK_COLORS: Record<string, string> = {
  faible: 'bg-[#D1FAE5] text-[#065F46]',
  moyen: 'bg-[#F5F0E3] text-[#926B2D]',
  eleve: 'bg-[#FEE2E2] text-[#991B1B]',
}
export const BILLING_LABELS: Record<string, string> = { forfait: 'Forfait', horaire: 'Horaire', abonnement: 'Abonnement', success_fee: 'Success fee', provision: 'Provision' }
export const INVOICE_TYPE_LABELS: Record<string, string> = { devis: 'Devis', facture: 'Facture', avoir: 'Avoir', recu: 'Reçu' }
export const INVOICE_TYPE_COLORS: Record<string, string> = { devis: 'bg-[#2563EB] text-white', facture: 'bg-[#1E5A8A] text-white', avoir: 'bg-[#DC2626] text-white', recu: 'bg-[#059669] text-white' }
export const PAYMENT_METHOD_LABELS: Record<string, string> = { especes: 'Espèces', virement: 'Virement', mobile_money: 'Mobile Money', carte: 'Carte', cheque: 'Chèque' }
export const PAYMENT_METHOD_COLORS: Record<string, string> = { especes: 'bg-[#059669]', virement: 'bg-[#1E5A8A]', mobile_money: 'bg-[#C8A45D]', carte: 'bg-[#7C3AED]', cheque: 'bg-[#6B7280]' }
export const CHART_COLORS = ['#1E5A8A', '#C8A45D', '#059669', '#DC2626', '#6B7280', '#F59E0B']
export const CHART_COLORS_DARK = ['#4A8FCA', '#E0C87A', '#34D399', '#FB7185', '#9CA3AF', '#FBBF24']
export const CASE_STATUS_LABELS: Record<string, string> = { nouveau: 'Nouveau', ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente', clos: 'Clos', archive: 'Archivé' }
export const INVOICE_STATUS_LABELS: Record<string, string> = { non_paye: 'Non payé', partiel: 'Partiel', paye: 'Payé', annule: 'Annulé' }
export const COMM_TYPE_LABELS: Record<string, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' }
export const COMM_TYPE_COLORS: Record<string, string> = { email: 'bg-jl-blue text-white', sms: 'bg-[var(--success)] text-white', whatsapp: 'bg-[var(--success)] text-white' }
export const COMM_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-[#D1FAE5] text-[#065F46]', pending: 'bg-[var(--accent-light)] text-[#92400E]', failed: 'bg-[#FEE2E2] text-[#991B1B]', bounced: 'bg-jl-page text-jl-secondary',
}
export const COMM_STATUS_LABELS: Record<string, string> = { sent: 'Envoyé', pending: 'En attente', failed: 'Échoué', bounced: 'Rebondi' }
export const QUICK_TEMPLATES = [
  { label: 'Rappel audience', content: 'Bonjour {name},\n\nNous vous rappelons que votre audience est prévue le {date} à {time} au {location}.\n\nCordialement,' },
  { label: 'Relance facture', content: "Bonjour {name},\n\nNous vous prions de bien vouloir régler la facture n° {ref} d'un montant de {amount} qui est arrivée à échéance le {date}.\n\nCordialement," },
  { label: 'Demande de pièces', content: 'Bonjour {name},\n\nDans le cadre du dossier {caseRef}, nous aurions besoin des pièces suivantes :\n- {doc1}\n- {doc2}\n\nMerci de nous les transmettre dès que possible.\n\nCordialement,' },
  { label: 'Confirmation rendez-vous', content: 'Bonjour {name},\n\nNous confirmons votre rendez-vous le {date} à {time} dans nos locaux.\n\nCordialement,' },
]

export const NAV_ITEMS: { view: ViewName; labelKey: string; icon: React.ElementType; adminOnly?: boolean; permission?: { resource: string; action: string } }[] = [
  { view: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { view: 'cases', labelKey: 'nav.cases', icon: Briefcase, permission: { resource: 'case', action: 'view' } },
  { view: 'clients', labelKey: 'nav.clients', icon: Users, permission: { resource: 'client', action: 'view' } },
  { view: 'tasks', labelKey: 'nav.tasks', icon: ClipboardList, permission: { resource: 'task', action: 'view' } },
  { view: 'documents', labelKey: 'nav.documents', icon: FileText, permission: { resource: 'document', action: 'view' } },
  { view: 'calendar', labelKey: 'nav.calendar', icon: Calendar, permission: { resource: 'event', action: 'view' } },
  { view: 'invoices', labelKey: 'nav.invoices', icon: Receipt, permission: { resource: 'invoice', action: 'view' } },
  { view: 'finances', labelKey: 'nav.finances', icon: TrendingUp, permission: { resource: 'invoice', action: 'view' } },
  { view: 'impayes', labelKey: 'nav.impayes', icon: AlertOctagon, permission: { resource: 'invoice', action: 'view' } },
  { view: 'time-tracking', labelKey: 'nav.timeTracking', icon: Timer, permission: { resource: 'task', action: 'view' } },
  { view: 'communications', labelKey: 'nav.communications', icon: SendHorizontal, permission: { resource: 'message', action: 'view' } },
  { view: 'templates', labelKey: 'nav.templates', icon: FileCode2, permission: { resource: 'document', action: 'view' } },
  { view: 'messages', labelKey: 'nav.messages', icon: MessageSquare, permission: { resource: 'message', action: 'view' } },
  { view: 'reports', labelKey: 'nav.reports', icon: BarChart3, permission: { resource: 'report', action: 'view' } },
  { view: 'notifications', labelKey: 'nav.notifications', icon: Bell, permission: { resource: 'notification', action: 'view' } },
  { view: 'search', labelKey: 'nav.search', icon: Search },
  { view: 'audit-logs', labelKey: 'nav.auditLogs', icon: Shield, adminOnly: true, permission: { resource: 'audit', action: 'view' } },
  { view: 'settings', labelKey: 'nav.settings', icon: Settings },
]

export const ADMIN_NAV_ITEMS: { view: ViewName; labelKey: string; icon: React.ElementType }[] = [
  { view: 'admin-dashboard', labelKey: 'nav.admin.dashboard', icon: LayoutDashboard },
  { view: 'admin-cabinets', labelKey: 'nav.admin.cabinets', icon: BuildingIcon },
  { view: 'admin-users', labelKey: 'nav.admin.users', icon: UsersRound },
 { view: 'admin-plans', labelKey: 'nav.admin.plans', icon: CreditCardIcon },
  { view: 'settings', labelKey: 'nav.settings', icon: Settings },
]
