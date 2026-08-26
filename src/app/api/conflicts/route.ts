import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function POST(request: Request) {
  const auth = await authenticate(request, 'conflicts', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, clientId, adversary, caseId } = body as {
      tenantId: string
      clientId: string
      adversary?: string
      caseId?: string
    }

    if (!tenantId || !clientId) {
      return NextResponse.json({ error: 'tenantId and clientId are required' }, { status: 400 })
    }

    const conflicts: {
      type: 'client_as_adversary' | 'adversary_as_client'
      case: { id: string; reference: string; title: string; clientName: string }
      description: string
    }[] = []

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, fullName: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientFullName = client.fullName.toLowerCase().trim()

    if (adversary && adversary.trim()) {
      const adversaryLower = adversary.toLowerCase().trim()

      const matchingClients = await db.client.findMany({
        where: {
          tenantId,
          id: { not: clientId },
        },
        select: { id: true, fullName: true, cases: {
          select: { id: true, reference: true, title: true },
          take: 5,
        }},
      })

      for (const c of matchingClients) {
        const name = c.fullName.toLowerCase().trim()
        if (name.includes(adversaryLower) || adversaryLower.includes(name)) {
          for (const caze of c.cases) {
            conflicts.push({
              type: 'adversary_as_client',
              case: {
                id: caze.id,
                reference: caze.reference,
                title: caze.title,
                clientName: c.fullName,
              },
              description: `La partie adverse "${adversary}" correspond à un client existant (${c.fullName}) dans le dossier ${caze.reference}`,
            })
          }
        }
      }

      const casesWithMatchingAdversary = await db.case.findMany({
        where: {
          tenantId,
          ...(caseId ? { id: { not: caseId } } : {}),
          adversary: { not: null },
        },
        include: {
          client: { select: { fullName: true } },
        },
      })

      for (const caze of casesWithMatchingAdversary) {
        if (caze.adversary) {
          const existingAdversary = caze.adversary.toLowerCase().trim()
          if (
            existingAdversary.includes(adversaryLower) ||
            adversaryLower.includes(existingAdversary)
          ) {
            conflicts.push({
              type: 'client_as_adversary',
              case: {
                id: caze.id,
                reference: caze.reference,
                title: caze.title,
                clientName: caze.client.fullName,
              },
              description: `La partie adverse "${adversary}" apparaît déjà comme partie adverse dans le dossier ${caze.reference}`,
            })
          }
        }
      }
    }

    const casesWhereClientIsAdversary = await db.case.findMany({
      where: {
        tenantId,
        ...(caseId ? { id: { not: caseId } } : {}),
        adversary: { not: null },
      },
      include: {
        client: { select: { fullName: true } },
      },
    })

    for (const caze of casesWhereClientIsAdversary) {
      if (caze.adversary) {
        const existingAdversary = caze.adversary.toLowerCase().trim()
        if (
          existingAdversary.includes(clientFullName) ||
          clientFullName.includes(existingAdversary)
        ) {
          const alreadyAdded = conflicts.some(
            (c) => c.type === 'client_as_adversary' && c.case.id === caze.id
          )
          if (!alreadyAdded) {
            conflicts.push({
              type: 'client_as_adversary',
              case: {
                id: caze.id,
                reference: caze.reference,
                title: caze.title,
                clientName: caze.client.fullName,
              },
              description: `Le client ${client.fullName} est listé comme partie adverse dans le dossier ${caze.reference}`,
            })
          }
        }
      }
    }

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('Conflict detection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
