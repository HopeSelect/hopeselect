'use server'

import { redirect } from 'next/navigation'
import { criarClienteServer } from '@/lib/supabase/server'

export type EstadoLogin = { erro: string } | null

// Signup público é desativado — aqui só autenticamos usuários já criados pelo admin.
export async function entrar(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')

  if (!email || !senha) {
    return { erro: 'Preencha e-mail e senha.' }
  }

  const supabase = await criarClienteServer()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error) {
    return { erro: 'E-mail ou senha inválidos.' }
  }

  redirect('/')
}
