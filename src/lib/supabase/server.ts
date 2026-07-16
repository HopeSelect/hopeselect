import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente para Server Components, Server Actions e Route Handlers.
// Continua usando a chave anon + sessão do usuário (cookies) -> RLS se aplica.
export async function criarClienteServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Chamado a partir de um Server Component: sem acesso de escrita
            // aos cookies. O refresh da sessão é feito no middleware.
          }
        },
      },
    },
  )
}
