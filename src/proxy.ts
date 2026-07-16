import { type NextRequest } from 'next/server'
import { atualizarSessao } from '@/lib/supabase/session'

// Convenção "proxy" do Next 16 (substitui o antigo "middleware").
export async function proxy(request: NextRequest) {
  return await atualizarSessao(request)
}

export const config = {
  // Roda em tudo, menos assets estáticos.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
