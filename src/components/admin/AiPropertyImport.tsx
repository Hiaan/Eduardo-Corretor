'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { PropertyForm } from './PropertyForm'
import type { PropertyFormValues } from '@/lib/validations/property'
import type { Feature, Neighborhood } from '@/types'

const BUCKET = 'property-images'
/** Photos sent to the AI (all photos are still saved on the property). */
const MAX_AI_IMAGES = 12
const AI_IMAGE_MAX_SIDE = 1024
const UPLOAD_CONCURRENCY = 4

interface LocalPhoto {
  id: string
  name: string
  preview: string
  /** Small JPEG (base64, no prefix) for the AI. null if the browser can't decode it. */
  aiData: string | null
  url: string | null
  status: 'uploading' | 'done' | 'error'
}

interface AiResult extends Partial<PropertyFormValues> {
  cover_photo?: number | null
  notes?: string[]
}

interface Props {
  features: Feature[]
  neighborhoods: Neighborhood[]
}

/** Downscale an image file to a JPEG for the AI request. */
async function toAiJpeg(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, AI_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.75).split(',')[1] ?? null
  } catch {
    return null
  }
}

export function AiPropertyImport({ features, neighborhoods }: Props) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<LocalPhoto[]>([])
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<{ key: number; values: Partial<PropertyFormValues>; notes: string[] } | null>(null)

  const updatePhoto = (id: string, patch: Partial<LocalPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const uploadOne = async (photo: LocalPhoto, file: File) => {
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) {
      updatePhoto(photo.id, { status: 'error' })
      return
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path)
    updatePhoto(photo.id, { status: 'done', url: publicUrl })
  }

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return

    const prepared = await Promise.all(
      files.map(async (file) => ({
        file,
        photo: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          preview: URL.createObjectURL(file),
          aiData: await toAiJpeg(file),
          url: null,
          status: 'uploading' as const,
        },
      }))
    )
    setPhotos((prev) => [...prev, ...prepared.map((p) => p.photo)])
    if (inputRef.current) inputRef.current.value = ''

    // Upload originals in small parallel batches
    const queue = [...prepared]
    const workers = Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
      while (queue.length) {
        const next = queue.shift()!
        await uploadOne(next.photo, next.file)
      }
    })
    await Promise.all(workers)
  }

  const removePhoto = (id: string) =>
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.preview)
      return prev.filter((x) => x.id !== id)
    })

  const uploading = photos.some((p) => p.status === 'uploading')
  const failed = photos.filter((p) => p.status === 'error').length

  const analyze = async () => {
    if (!text.trim() && !photos.length) {
      toast({
        variant: 'destructive',
        title: 'Nada para analisar',
        description: 'Arraste as fotos e/ou escreva o texto do imóvel.',
      })
      return
    }
    setAnalyzing(true)
    try {
      const aiPhotos = photos.filter((p) => p.aiData).slice(0, MAX_AI_IMAGES)
      const res = await fetch('/api/ai/imovel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          images: aiPhotos.map((p) => ({ data: p.aiData, media_type: 'image/jpeg' })),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: AiResult; error?: string }
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Erro ao analisar com IA')
      }

      const { cover_photo, notes, ...values } = json.data

      // Photo numbers given to the AI map to aiPhotos; find that photo among the uploaded ones
      const uploaded = photos.filter((p) => p.status === 'done' && p.url)
      const coverId =
        cover_photo && aiPhotos[cover_photo - 1] ? aiPhotos[cover_photo - 1].id : uploaded[0]?.id
      const ordered = [
        ...uploaded.filter((p) => p.id === coverId),
        ...uploaded.filter((p) => p.id !== coverId),
      ]

      setResult({
        key: Date.now(),
        notes: notes ?? [],
        values: {
          ...values,
          status: 'draft',
          images: ordered.map((p, i) => ({
            url: p.url!,
            alt: values.title ?? null,
            is_cover: i === 0,
            display_order: i,
          })),
        },
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível analisar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setAnalyzing(false)
    }
  }

  /* ─── Step 2: review the pre-filled form ─── */
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-5">
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="h-5 w-5 text-brand-gold" />
              Pronto! Confira os campos abaixo e clique em salvar.
            </p>
            <p className="text-sm text-muted-foreground">
              O imóvel será salvo como <strong>Rascunho</strong>. Mude o status para
              &quot;Publicado&quot; quando quiser que apareça no site.
            </p>
            {result.notes.length > 0 && (
              <ul className="space-y-1 pt-1 text-sm text-amber-700 dark:text-amber-400">
                {result.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => setResult(null)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar e ajustar texto/fotos
          </Button>
        </div>

        <PropertyForm
          key={result.key}
          features={features}
          neighborhoods={neighborhoods}
          initialData={result.values}
        />
      </div>
    )
  }

  /* ─── Step 1: drop photos + paste text ─── */
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label className="text-base">1. Fotos do imóvel</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Arraste todas de uma vez. Elas já são salvas e a IA escolhe a melhor para capa.
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors',
            dragging
              ? 'border-brand-gold bg-brand-gold/10'
              : 'border-border bg-secondary/30 hover:border-brand-gold'
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Clique ou arraste as fotos aqui
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG ou WEBP · a IA analisa as {MAX_AI_IMAGES} primeiras, todas vão para o anúncio
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {photos.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              {uploading && ' · enviando...'}
              {failed > 0 && ` · ${failed} com erro no envio (não serão salvas)`}
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {photos.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-lg border-2',
                    p.status === 'error' ? 'border-destructive' : 'border-transparent'
                  )}
                >
                  <Image
                    src={p.preview}
                    alt={p.name}
                    fill
                    unoptimized
                    sizes="160px"
                    className="object-cover"
                  />
                  <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {p.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-destructive opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                    title="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="ai-text" className="text-base">
            2. Texto sobre o imóvel
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Cole do jeito que estiver: anúncio, mensagem do WhatsApp, ficha da construtora.
            A IA separa título, preço, bairro, área, quartos, características e escreve a
            descrição.
          </p>
        </div>
        <Textarea
          id="ai-text"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            'Ex.: Apto no Cabo Branco, 3 suítes, 142m², 2 vagas, vista mar, varanda gourmet, ' +
            'prédio com piscina e academia. Condomínio 1.200, IPTU 2.800/ano. R$ 1.350.000'
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {uploading && (
          <span className="text-sm text-muted-foreground">
            Aguarde o envio das fotos terminar...
          </span>
        )}
        <Button
          type="button"
          variant="gold"
          size="lg"
          onClick={analyze}
          disabled={analyzing || uploading}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando... (pode levar até 1 minuto)
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Preencher com IA
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

