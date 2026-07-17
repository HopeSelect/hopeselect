'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sair } from '@/lib/acoes-auth'
import estilos from './nav.module.css'

const ITENS = [
  { href: '/sala', rotulo: 'Sala' },
  { href: '/professores', rotulo: 'Professores' },
  { href: '/alunos', rotulo: 'Alunos' },
  { href: '/tarefas', rotulo: 'Tarefas' },
  { href: '/relatorios', rotulo: 'Relatórios' },
]

// Cabeçalho das telas internas. A tela de login não usa este componente.
export function Nav() {
  const rotaAtual = usePathname()

  return (
    <header className={estilos.header}>
      <nav className={estilos.nav}>
        <Link href="/" className={estilos.marca}>
          <span className={estilos.marcaPonto} aria-hidden />
          Hope Select
        </Link>

        <div className={estilos.links}>
          {ITENS.map((item) => {
            const ativo = rotaAtual?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={ativo ? `${estilos.link} ${estilos.linkAtivo}` : estilos.link}
                aria-current={ativo ? 'page' : undefined}
              >
                {item.rotulo}
              </Link>
            )
          })}
        </div>

        <form action={sair} className={estilos.sair} style={{ marginLeft: 'auto' }}>
          <button type="submit" style={{ all: 'unset', cursor: 'pointer' }}>
            Sair
          </button>
        </form>
      </nav>
    </header>
  )
}
