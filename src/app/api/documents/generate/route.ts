import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'

/**
 * POST /api/documents/generate
 * Generates a document from a template and case data.
 * Returns the document as a downloadable file (txt or html).
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'document', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()

  try {
    const body = await request.json()
    const { templateId, caseId, data: extraData, format: reqFormat } = body

    if (!templateId || !caseId) {
      return NextResponse.json({ error: 'templateId et caseId sont requis' }, { status: 400 })
    }

    // Fetch template
    const template = await db.documentTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template) {
      return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
    }
    if (!requireTenantAccess(auth, template.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch case with relations
    const caseData = await db.case.findUnique({
      where: { id: caseId },
      include: {
        client: { select: { id: true, fullName: true, company: true, clientType: true, email: true, phone: true, address: true, city: true, country: true, niu: true } },
        tenant: { select: { id: true, name: true, address: true, phone: true, email: true, city: true, country: true, niu: true, logoUrl: true } },
        assignments: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
      },
    })
    if (!caseData) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }
    if (!requireTenantAccess(auth, caseData.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Build replacement map
    const now = new Date()
    const replacements: Record<string, string> = {
      'case.reference': caseData.reference || '',
      'case.title': caseData.title || '',
      'case.description': caseData.description || '',
      'case.type': caseData.caseType || '',
      'case.status': caseData.status || '',
      'case.priority': caseData.priority || '',
      'case.adversary': caseData.adversary || '',
      'case.jurisdiction': caseData.jurisdiction || '',
      'case.amount': caseData.amountInDispute ? new Intl.NumberFormat('fr-FR').format(caseData.amountInDispute) + ' XAF' : '',
      'case.billingType': caseData.billingType || '',
      'case.createdAt': now.toLocaleDateString('fr-FR'),
      'client.name': caseData.client?.fullName || '',
      'client.company': caseData.client?.company || '',
      'client.type': caseData.client?.clientType || '',
      'client.email': caseData.client?.email || '',
      'client.phone': caseData.client?.phone || '',
      'client.address': [caseData.client?.address, caseData.client?.city, caseData.client?.country].filter(Boolean).join(', '),
      'client.niu': caseData.client?.niu || '',
      'tenant.name': caseData.tenant?.name || '',
      'tenant.address': [caseData.tenant?.address, caseData.tenant?.city, caseData.tenant?.country].filter(Boolean).join(', '),
      'tenant.phone': caseData.tenant?.phone || '',
      'tenant.email': caseData.tenant?.email || '',
      'tenant.niu': caseData.tenant?.niu || '',
      'date': now.toLocaleDateString('fr-FR'),
      'datetime': now.toLocaleString('fr-FR'),
      'year': String(now.getFullYear()),
      'lawyer.name': caseData.assignments[0]?.user?.fullName || '',
      'lawyer.email': caseData.assignments[0]?.user?.email || '',
      'lawyer.phone': caseData.assignments[0]?.user?.phone || '',
    }

    // Merge extra data
    if (extraData && typeof extraData === 'object') {
      for (const [key, val] of Object.entries(extraData)) {
        replacements[key] = String(val || '')
      }
    }

    // Replace placeholders in template content
    let generated = template.content
    for (const [key, val] of Object.entries(replacements)) {
      generated = generated.replaceAll(`{{${key}}}`, val)
    }
    // Clean remaining unreplaced placeholders
    generated = generated.replace(/\{\{[^}]+\}\}/g, '')

    // Determine format
    const fmt = reqFormat || 'txt'
    const fileName = `${template.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, '_')}_${caseData.reference || 'doc'}.${fmt}`
    let contentType = 'text/plain; charset=utf-8'
    let output = generated

    if (fmt === 'html') {
      contentType = 'text/html; charset=utf-8'
      output = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${template.name}</title>
<style>
  body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1E5A8A; padding-bottom: 20px; }
  .header h1 { color: #1E5A8A; font-size: 18pt; margin: 0 0 5px; }
  .header p { color: #666; font-size: 10pt; margin: 2px 0; }
  .content { white-space: pre-wrap; font-size: 12pt; }
  .footer { margin-top: 60px; border-top: 1px solid #ccc; padding-top: 15px; font-size: 9pt; color: #888; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <h1>${caseData.tenant?.name || ''}</h1>
  <p>${[caseData.tenant?.address, caseData.tenant?.phone, caseData.tenant?.email].filter(Boolean).join(' | ')}</p>
</div>
<div class="content">${generated}</div>
<div class="footer">Document généré par JurisLink — ${now.toLocaleString('fr-FR')}</div>
</body>
</html>`
    }

    return new NextResponse(output, {
 headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
