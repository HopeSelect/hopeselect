import { createBrowserClient } from '@supabase/ssr'

// Cliente para uso no browser (Client Components). Usa a chave anon,
// que é pública por design — a segurança real vem do RLS no banco.
export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
