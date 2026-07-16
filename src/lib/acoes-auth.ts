'use server'

import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'

export async function sair() {
  const supabase = await criarClienteServer()
  await supabase.auth.signOut()
  redirect('/login')
}
