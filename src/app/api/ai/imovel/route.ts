import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { extractProperty, type AiImageInput } from '@/lib/ai/property-extract'
import type { Feature, Neighborhood } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_IMAGES = 12
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** Lowercase + strip accents, for forgiving name matching. */
function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Reads the broker's free text + photos, asks Claude to split it into the
 * property fields, and maps names back to neighborhood / feature ids.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          'A chave da IA não está configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente do site.',
      },
      { status: 500 }
    )
  }

  let body: { text?: string; images?: AiImageInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  const text = (body.text ?? '').slice(0, 20000)
  const images = (body.images ?? [])
    .filter((img) => img && typeof img.data === 'string' && ALLOWED_TYPES.has(img.media_type))
    .slice(0, MAX_IMAGES)

  if (!text.trim() && !images.length) {
    return NextResponse.json(
      { error: 'Envie fotos ou escreva um texto sobre o imóvel.' },
      { status: 400 }
    )
  }

  const [{ data: hoodsData }, { data: featsData }] = await Promise.all([
    supabase.from('neighborhoods').select('*').order('name'),
    supabase.from('features').select('*').order('name'),
  ])
  const neighborhoods = (hoodsData ?? []) as Neighborhood[]
  const features = (featsData ?? []) as Feature[]

  try {
    const result = await extractProperty({ text, images, neighborhoods, features })

    const hood = neighborhoods.find((n) => norm(n.name) === norm(result.neighborhood))
    const featureIds = result.features
      .map((name) => features.find((f) => norm(f.name) === norm(name))?.id)
      .filter((id): id is string => !!id)

    return NextResponse.json({
      data: {
        ...result,
        neighborhood: hood?.name ?? result.neighborhood,
        neighborhood_id: hood?.id ?? null,
        state: (result.state || 'PB').slice(0, 2).toUpperCase(),
        features: Array.from(new Set(featureIds)),
      },
    })
  } catch (err) {
    console.error('[ai/imovel]', err)
    let message = err instanceof Error ? err.message : 'Erro ao analisar com IA'
    if (err instanceof Anthropic.AuthenticationError) {
      message = 'Chave da IA inválida. Confira ANTHROPIC_API_KEY.'
    } else if (err instanceof Anthropic.RateLimitError) {
      message = 'Muitas análises seguidas. Aguarde um minuto e tente de novo.'
    } else if (err instanceof Anthropic.BadRequestError) {
      message = 'A IA não aceitou os dados enviados. Tente com menos fotos.'
    } else if (err instanceof Anthropic.APIError) {
      message = 'O serviço de IA está instável. Tente novamente em instantes.'
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
