'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServer } from '@/lib/supabase/server'
import type { Papel } from '@/lib/tipos'

// RLS já restringe isso a admin (perfis_update exige eh_admin()) — aqui só
// repassamos o erro se alguém sem permissão tentar de outro jeito.
export async function alterarPapelUsuario(id: string, papel: Papel): Promise<{ erro: string } | null> {
  const supabase = await criarClienteServer()
  const { error } = await supabase.from('perfis').update({ papel }).eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/admin')
  return null
}

export async function definirAtivoUsuario(id: string, ativo: boolean): Promise<{ erro: string } | null> {
  const supabase = await criarClienteServer()
  const { error } = await supabase.from('perfis').update({ ativo }).eq('id', id)
  if (error) return { erro: error.message }
  revalidatePath('/admin')
  return null
}