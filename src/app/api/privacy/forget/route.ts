import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { compare } from 'bcryptjs'
import { randomUUID } from 'crypto'

/**
 * POST /api/privacy/forget
 * Droit à l'effacement (Loi 2024/017) — anonymisation irréversible des données personnelles.
 * Requiert la confirmation du mot de passe.
 *
 * Actions :
 * - Anonymiser : fullName → 'Anonymized', email → 'anonymized-{uuid}@deleted.jurislink', phone → null, avatarUrl → null
 * - Supprimer : toutes les notes personnelles, messages envoyés/reçus, notifications
 * - Conserver : dossiers (référence anonymisée), factures (comptabilité), journaux d'audit (anonymisés)
 * - Désactiver le compte
 *
 * CETTE ACTION EST IRRÉVERSIBLE.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'user', 'update')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Le mot de passe est requis pour confirmer cette action' }, { status: 400 })
    }

    // ── Vérifier le mot de passe ──
    const user = await db.user.findUnique({
      where: { id: auth.id },
      select: { id: true, password: true, fullName: true, email: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Impossible de vérifier le mot de passe' }, { status: 400 })
    }

    const valid = await compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    const userId = user.id
    const tenantId = auth.tenantId
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    // ── Journal d'audit AVANT l'anonymisation (pour tracer qui a demandé l'effacement) ──
    await db.auditLog.create({
      data: {
        action: 'right_to_be_forgotten',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({ previousEmail: user.email, previousName: user.fullName }),
        ipAddress,
        userAgent,
        tenantId: tenantId || '',
        userId,
      },
    })

    const anonymizedEmail = `anonymized-${randomUUID().slice(0, 8)}@deleted.jurislink`
    const anonUuid = randomUUID().slice(0, 8)

    // ── Anonymiser l'utilisateur ──
    await db.user.update({
      where: { id: userId },
      data: {
        fullName: 'Anonymized',
        email: anonymizedEmail,
        phone: null,
        avatarUrl: null,
        isActive: false,
        mfaEnabled: false,
        mfaSecret: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // ── Anonymiser les messages envoyés par l'utilisateur ──
    await db.message.updateMany({
      where: { senderId: userId },
      data: { content: '[Message supprimé — droit à l\'effacement]' },
    })

    // ── Supprimer les messages reçus par l'utilisateur ──
    await db.message.deleteMany({
      where: { receiverId: userId },
    })

    // ── Supprimer les notes (case notes) rédigées par l'utilisateur ──
    await db.caseNote.deleteMany({
      where: { authorId: userId },
    })

    // ── Supprimer les notifications de l'utilisateur ──
    await db.notification.deleteMany({
      where: { userId },
    })

    // ── Anonymiser les communications envoyées par l'utilisateur ──
    await db.communication.updateMany({
      where: { sentById: userId },
      data: {
        content: '[Communication anonymisée — droit à l\'effacement]',
        subject: '[Sujet supprimé]',
      },
    })

    // ── Anonymiser les entrées de temps (conserver pour facturation) ──
    await db.timeEntry.updateMany({
      where: { userId },
      data: { description: '[Temps anonymisé — droit à l\'effacement]' },
    })

    // ── Anonymiser les journaux d'audit existants de l'utilisateur ──
    // On ne supprime pas les logs mais on anonymise la référence
    await db.$executeRaw`
      UPDATE audit_logs
      SET user_id = NULL,
          metadata = CONCAT('[Anonymisé ', ${anonUuid}, ']')
      WHERE user_id = ${userId}::uuid
    `

    // ── Anonymiser le contenu des paiements enregistrés par l'utilisateur (garder montant/méthode pour compta) ──
    await db.payment.updateMany({
      where: { recordedBy: userId },
      data: { notes: '[Enregistré par utilisateur anonymisé]' },
    })

    return NextResponse.json({
      message:
        'Vos données personnelles ont été anonymisées conformément à la Loi n°2024/017. Cette action est irréversible.',
    })
  } catch (error) {
    console.error('Erreur droit à l\'effacement:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement de la demande' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
