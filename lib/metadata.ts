import type { Metadata } from 'next'

const BASE = 'Kritik'
const DESC = 'Yapay zeka destekli futbol analizi — xG verileri, form skorları ve sakatlık etki analizi.'

export function meta(title: string, description?: string): Metadata {
  return {
    title: `${title} — ${BASE}`,
    description: description ?? DESC,
    openGraph: {
      title: `${title} — ${BASE}`,
      description: description ?? DESC,
      siteName: BASE,
    },
  }
}
