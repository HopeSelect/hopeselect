'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { sair } from '@/lib/acoes-auth'
import estilos from './app-shell.module.css'

const CHAVE_SIDEBAR_ABERTA = 'hope-select:sidebar-aberta'

type ItemMenu = {
  href: string
  rotulo: string
  icone: React.ReactNode
}

const ITENS: ItemMenu[] = [
  {
    href: '/',
    rotulo: 'Início',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9h5v-5h2v5h5v-9" />
      </svg>
    ),
  },
  {
    href: '/sala',
    rotulo: 'Sala',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <rect x="6.5" y="7.5" width="7" height="5" rx="1" />
        <rect x="6.5" y="14.5" width="4" height="2.5" rx="0.8" />
      </svg>
    ),
  },
  {
    href: '/professores',
    rotulo: 'Professores',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8.5" r="3.2" />
        <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
        <circle cx="17" cy="8" r="2.3" />
        <path d="M15.2 14.3c2.6.2 4.6 2.2 4.6 5.2" />
      </svg>
    ),
  },
  {
    href: '/alunos',
    rotulo: 'Alunos',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: '/tarefas',
    rotulo: 'Tarefas',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 3.5h6v2H9z" />
        <path d="M8.5 12l2 2 4-4.2" />
      </svg>
    ),
  },
  {
    href: '/relatorios',
    rotulo: 'Relatórios',
    icone: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M11 20V4M18 20v-7" />
        <path d="M2.5 20.5h19" />
      </svg>
    ),
  },
]

const TITULOS: Record<string, string> = {
  '/': 'Início',
  '/sala': 'Sala',
  '/professores': 'Professores',
  '/alunos': 'Alunos',
  '/tarefas': 'Tarefas',
  '/relatorios': 'Relatórios',
}

function tituloDaRota(pathname: string): string {
  if (pathname === '/') return TITULOS['/']
  const item = ITENS.find((i) => i.href !== '/' && pathname.startsWith(i.href))
  return item?.rotulo ?? 'Hope Select'
}

function itemAtivo(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

// Casca visual do sistema: menu lateral recolhível + cabeçalho com título da
// tela e relógio. Substitui o antigo <Nav /> (cabeçalho horizontal) em todas
// as telas internas — a tela de login continua fora disso.
export function AppShell({
  titulo,
  children,
}: {
  titulo?: string
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? '/'
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [agora, setAgora] = useState<Date | null>(null)

  // Preferência de UI (não é dado de negócio), por isso pode viver no
  // localStorage do navegador — só lida depois da montagem para não
  // divergir da renderização do servidor (window não existe no SSR).
  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_SIDEBAR_ABERTA)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de localStorage só é possível no cliente, depois da montagem
    if (salvo !== null) setSidebarAberta(salvo === '1')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CHAVE_SIDEBAR_ABERTA, sidebarAberta ? '1' : '0')
  }, [sidebarAberta])

  // Relógio do cabeçalho: sincroniza com o sistema externo "hora atual",
  // por isso mora num efeito (mesmo padrão do exemplo de relógio da doc do React).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só dá pra saber a hora depois de montar no cliente
    setAgora(new Date())
    const id = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Não precisa de efeito para fechar o menu mobile ao navegar: cada
  // página inclui o próprio <AppShell>, então a troca de rota já
  // desmonta/remonta este componente e `menuMobileAberto` nasce false de novo.

  const tituloExibido = titulo ?? tituloDaRota(pathname)

  return (
    <div className={estilos.shell}>
      <aside
        className={
          estilos.sidebar +
          (sidebarAberta ? '' : ` ${estilos.sidebarFechada}`) +
          (menuMobileAberto ? ` ${estilos.sidebarAberta}` : '')
        }
      >
        <div className={estilos.sidebarTopo}>
          <Image
            src="/logo-hope-select-icone.png"
            alt="Hope Select"
            width={34}
            height={34}
            className={estilos.logo}
          />
          {sidebarAberta && <span className={estilos.marca}>HOPE SELECT</span>}
        </div>

        <nav className={estilos.nav}>
          {ITENS.map((item) => {
            const ativo = itemAtivo(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={ativo ? `${estilos.navItem} ${estilos.navItemAtivo}` : estilos.navItem}
                aria-current={ativo ? 'page' : undefined}
                title={sidebarAberta ? undefined : item.rotulo}
              >
                <span className={estilos.navIcone}>{item.icone}</span>
                {sidebarAberta && <span className={estilos.navLabel}>{item.rotulo}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={estilos.rodape}>
          <form action={sair}>
            <button type="submit" className={estilos.botaoSair} title={sidebarAberta ? undefined : 'Sair'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
                <path d="M16 16l4-4-4-4" />
                <path d="M20 12H9" />
              </svg>
              {sidebarAberta && <span>Sair</span>}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSidebarAberta((v) => !v)}
            className={estilos.botaoColapsar}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={estilos.iconeColapsar}
              style={{ transform: sidebarAberta ? undefined : 'rotate(180deg)' }}
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
            {sidebarAberta && <span>Recolher menu</span>}
          </button>
        </div>
      </aside>

      {menuMobileAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className={estilos.scrim}
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      <div className={estilos.conteudo}>
        <header className={estilos.cabecalho}>
          <div className={estilos.cabecalhoEsquerda}>
            <button
              type="button"
              className={estilos.botaoMenuMobile}
              aria-label={menuMobileAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuMobileAberto}
              onClick={() => setMenuMobileAberto((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className={estilos.titulo}>{tituloExibido}</h1>
          </div>
          {agora && (
            <div className={estilos.relogio}>
              <span>{agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              <span className={estilos.relogioSeparador} aria-hidden />
              <span className={estilos.relogioHora}>
                {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </header>

        <div className={estilos.corpo}>{children}</div>
      </div>
    </div>
  )
}
