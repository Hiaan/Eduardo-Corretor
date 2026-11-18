import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod/v4'
import { PROPERTY_TYPES } from '@/lib/utils'
import type { Feature, Neighborhood } from '@/types'

const MODEL = 'claude-opus-5-5'

const TYPE_VALUES = PROPERTY_TYPES.map((t) => t.value) as [string, ...string[]]

/** Shape Claude must answer with. Nulls mean "not informed". */
export const ExtractedPropertySchema = z.object({
  title: z
    .string()
    .describe('Título comercial do anúncio, 40 a 80 caracteres, sem emojis'),
  purpose: z.enum(['sale', 'rent', 'both']),
  type: z.enum(TYPE_VALUES),
  city: z.string(),
  state: z.string().describe('UF com 2 letras'),
  neighborhood: z.string().describe('Bairro / região'),
  address: z.string().nullable(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  price: z.number().nullable().describe('Preço de venda (ou aluguel mensal) em reais'),
  condo_fee: z.number().nullable(),
  iptu: z.number().nullable(),
  private_area: z.number().nullable().describe('Área privativa/útil em m²'),
  total_area: z.number().nullable().describe('Área total/terreno em m²'),
  bedrooms: z.number().int(),
  suites: z.number().int(),
  bathrooms: z.number().int(),
  parking: z.number().int(),
  year_built: z.number().int().nullable(),
  description: z.string().describe('Descrição do anúncio em parágrafos, pronta para o site'),
  features: z
    .array(z.string())
    .describe('Nomes EXATOS da lista de características cadastradas que se aplicam'),
  is_furnished: z.boolean(),
  accepts_pets: z.boolean(),
  is_luxury: z.boolean(),
  is_launch: z.boolean(),
  video_url: z.string().nullable(),
  seo_title: z.string(),
  seo_description: z.string(),
  cover_photo: z
    .number()
    .int()
    .nullable()
    .describe('Número da foto (1, 2, 3...) que fica melhor como capa'),
  notes: z
    .array(z.string())
    .describe('Avisos curtos para o corretor: o que não foi encontrado ou precisa ser conferido'),
})

export type ExtractedProperty = z.infer<typeof ExtractedPropertySchema>

export interface AiImageInput {
  /** base64 without the data: prefix */
  data: string
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
}

function buildSystemPrompt(neighborhoods: Neighborhood[], features: Feature[]) {
  const types = PROPERTY_TYPES.map((t) => `${t.value} (${t.label})`).join(', ')
  const hoods = neighborhoods
    .map((n) => (n.city_name ? `${n.name} — ${n.city_name}` : n.name))
    .join('\n')
  const feats = features.map((f) => f.name).join('\n')

  return `Você ajuda o corretor Eduardo Vieira (imóveis de alto padrão em João Pessoa - PB) a cadastrar imóveis no site.
Você recebe o texto que ele colou (anúncio, mensagem de WhatsApp, ficha da construtora etc.) e as fotos do imóvel, e devolve os campos do cadastro.

Regras:
- Use somente o que está no texto e nas fotos. Não invente preço, área, endereço ou números. Campo numérico sem informação: null (quartos/suítes/banheiros/vagas sem informação: 0).
- Valores em reais como número puro: "R$ 1,2 mi" = 1200000; "850 mil" = 850000.
- Finalidade: "sale" para venda, "rent" para aluguel, "both" se o texto oferecer os dois.
- Tipo, um destes valores: ${types}.
- Cidade padrão: João Pessoa, UF PB, se o texto não disser outra.
- Bairro: se corresponder a um bairro cadastrado abaixo, escreva exatamente como está na lista; senão, escreva como no texto.
- Características: escolha só nomes que existam na lista abaixo, escritos exatamente iguais, quando o texto ou as fotos mostrarem claramente (ex.: piscina visível na foto).
- is_luxury: true para alto padrão evidente (valor alto, acabamento de luxo, vista mar, cobertura etc.). is_launch: true só se for lançamento/na planta.
- Título: atrativo e objetivo, ex.: "Apartamento 4 suítes com vista mar no Cabo Branco".
- Descrição: reescreva em português do Brasil, tom elegante e profissional, 2 a 4 parágrafos, destacando diferenciais; sem emojis, sem telefone e sem preço.
- seo_title até 60 caracteres; seo_description até 155 caracteres.
- cover_photo: a foto mais bonita e representativa (fachada, sala ampla ou vista), numerada como nas legendas "Foto N". null se não houver fotos.
- notes: liste o que faltou ou é ambíguo (ex.: "Preço não informado", "Área total não informada").

Bairros cadastrados:
${hoods || '(nenhum)'}

Características cadastradas:
${feats || '(nenhuma)'}`
}

export async function extractProperty({
  text,
  images,
  neighborhoods,
  features,
}: {
  text: string
  images: AiImageInput[]
  neighborhoods: Neighborhood[]
  features: Feature[]
}): Promise<ExtractedProperty> {
  const client = new Anthropic()

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  images.forEach((img, i) => {
    content.push({ type: 'text', text: `Foto ${i + 1}:` })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type, data: img.data },
    })
  })
  content.push({
    type: 'text',
    text: text.trim()
      ? `Texto do corretor:\n\n${text.trim()}`
      : 'O corretor não enviou texto; extraia o que for possível apenas das fotos.',
  })

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: betaZodOutputFormat(ExtractedPropertySchema),
    },
    system: buildSystemPrompt(neighborhoods, features),
    messages: [{ role: 'user', content }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('A IA recusou o pedido. Revise o texto e tente novamente.')
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw new Error('A IA não conseguiu montar o cadastro. Tente novamente.')
  }
  return response.parsed_output
}
