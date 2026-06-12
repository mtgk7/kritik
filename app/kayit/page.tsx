import KayitFlow from '@/components/KayitFlow'
import { meta } from '@/lib/metadata'

export const metadata = meta('Kayıt Ol')

export default async function KayitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>
}) {
  const params = await searchParams

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <KayitFlow refCode={params.ref} error={params.error} />
    </main>
  )
}
