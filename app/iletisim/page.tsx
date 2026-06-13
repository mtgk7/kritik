import { meta } from '@/lib/metadata'
import IletisimClient from './IletisimClient'

export const metadata = meta('Bize Ulaşın', 'Sorularınız ve talepleriniz için bize ulaşın.')

export default function IletisimPage() {
  return <IletisimClient />
}
