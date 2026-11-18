import { PageHeader } from '@/components/admin/PageHeader'
import { AiPropertyImport } from '@/components/admin/AiPropertyImport'
import { getAllFeatures, getNeighborhoods } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AiPropertyPage() {
  const [features, neighborhoods] = await Promise.all([
    getAllFeatures(),
    getNeighborhoods(false),
  ])

  return (
    <>
      <PageHeader
        title="Cadastrar com IA"
        description="Arraste as fotos, cole o texto e a IA preenche o cadastro para você revisar."
      />
      <AiPropertyImport features={features} neighborhoods={neighborhoods} />
    </>
  )
}
