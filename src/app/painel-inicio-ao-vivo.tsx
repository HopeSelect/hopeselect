'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { criarClienteBrowser } from '@/lib/supabase/client'

// Não renderiza nada visível — só escuta mudanças no banco e manda o
// Next.js buscar os dados de novo (router.refresh()), reaproveitando o
// mesmo cálculo que já roda no servidor na primeira carga da página.
// Isso evita ter a mesma lógica duplicada no cliente e no servidor,
// que era a causa da tela "travar" até dar F5.
export function AtualizadorInicio() {
  const router = useRouter()

  useEffect(() => {
    const supabase = criarClienteBrowser()
    const canal = supabase
      .channel('painel-inicio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professores' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [router])

  return null
}
