'use client'

import { FotoUpload } from '@/components/foto-upload'

export function FotoAluno({ inicial }: { inicial?: string | null }) {
  return <FotoUpload bucket="alunos" nomeCampo="foto_url" inicial={inicial} />
}
