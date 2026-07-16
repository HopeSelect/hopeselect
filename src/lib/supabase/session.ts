import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Mantém a sessão fresca (renova o token) e protege as rotas:
// sem usuário -> /login; usuário logado tentando /login -> home.
export async function atualizarSessao(request: NextRequest) {
  // Antes de configurar o Supabase (.env.local), não faz nada — deixa o app rodar.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Renova a sessão. Não remover esta chamada.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rota = request.nextUrl.pathname

  // Não autenticado tentando acessar área interna -> login.
  if (!user && rota !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Já autenticado tentando ver o login -> home.
  if (user && rota === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
