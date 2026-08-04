'use client'

import { FotoUpload } from '@/components/foto-upload'

export function FotoEspecialista({ inicial }: { inicial?: string | null }) {
  return <FotoUpload bucket="especialistas" nomeCampo="foto_url" inicial={inicial} />
}