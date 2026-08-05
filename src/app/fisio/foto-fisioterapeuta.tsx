'use client'

import { FotoUpload } from '@/components/foto-upload'

export function FotoFisioterapeuta({ inicial }: { inicial?: string | null }) {
  return <FotoUpload bucket="fisioterapeutas" nomeCampo="foto_url" inicial={inicial} />
}
