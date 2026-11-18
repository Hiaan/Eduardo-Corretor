import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { PropertiesTable } from '@/components/admin/PropertiesTable'
import { PropertiesFilterBar } from '@/components/admin/PropertiesFilterBar'
import { Button } from '@/components/ui/button'
import { getAdminProperties } from '@/lib/admin-queries'

export const dynamic = 'force-dynamic'

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  const properties = await getAdminProperties({
    status: searchParams.status,
    search: searchParams.search,
  })

  return (
    <>
      <PageHeader
        title="Imóveis"
        description={`${properties.length} ${
          properties.length === 1 ? 'imóvel' : 'imóveis'
        } cadastrados.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/imoveis/ia">
                <Sparkles className="h-4 w-4" />
                Cadastrar com IA
              </Link>
            </Button>
            <Button asChild variant="gold">
              <Link href="/admin/imoveis/novo">
                <Plus className="h-4 w-4" />
                Novo imóvel
              </Link>
            </Button>
          </div>
        }
      />

      <Suspense fallback={null}>
        <PropertiesFilterBar />
      </Suspense>

      <PropertiesTable properties={properties} />
    </>
  )
}
