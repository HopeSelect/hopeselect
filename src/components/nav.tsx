'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <header className={estilos.header}>
      <nav className={estilos.nav}>
        <Link href="/" className={estilos.marca} onClick={() => setMenuAberto(false)}>
          <span className={estilos.marcaPonto} aria-hidden />
          Hope Select
        </Link>

        {/* Links horizontais — visíveis só a partir do breakpoint md (ver nav.module.css) */}
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

        <form action={sair} className={estilos.sair}>
          <button type="submit" style={{ all: 'unset', cursor: 'pointer' }}>
            Sair
          </button>
        </form>

        {/* Botão hambúrguer — visível só abaixo do breakpoint md */}
        <button
          type="button"
          className={estilos.botaoMenu}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
        >
          {menuAberto ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {/* Painel mobile — só renderiza visualmente quando aberto e abaixo do breakpoint md */}
      <div
        className={
          menuAberto ? `${estilos.painelMobile} ${estilos.painelMobileAberto}` : estilos.painelMobile
        }
      >
        {ITENS.map((item) => {
          const ativo = rotaAtual?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={ativo ? `${estilos.linkMobile} ${estilos.linkMobileAtivo}` : estilos.linkMobile}
              aria-current={ativo ? 'page' : undefined}
              onClick={() => setMenuAberto(false)}
            >
              {item.rotulo}
            </Link>
          )
        })}
        <form action={sair}>
          <button type="submit" className={estilos.sairMobile}>
            Sair
          </button>
        </form>
      </div>
    </header>
  )
}
