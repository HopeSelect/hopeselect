import { redirect } from 'next/navigation'

// A raiz do site não tem tela própria — a recepção sempre começa
// pelo painel de sala. Professores/alunos ficam a um clique no menu.
export default function Home() {
  redirect('/sala')
}
