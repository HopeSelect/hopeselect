'use client'

import { FotoUpload } from '@/components/foto-upload'

export function FotoNutricionista({ inicial }: { inicial?: string | null }) {
  return <FotoUpload bucket="nutricionistas" nomeCampo="foto_url" inicial={inicial} />
}
