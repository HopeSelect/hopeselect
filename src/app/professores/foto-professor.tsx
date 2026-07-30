'use client'

import { FotoUpload } from '@/components/foto-upload'

export function FotoProfessor({ inicial }: { inicial?: string | null }) {
  return <FotoUpload bucket="professores" nomeCampo="foto_url" inicial={inicial} />
}
