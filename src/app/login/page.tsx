'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { entrar } from './actions'
import estilos from './login.module.css'

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState(entrar, null)

  return (
    <main className={estilos.pagina}>
      <form action={acao} className={estilos.cartao}>
        <div className={estilos.cabecalho}>
          <div className={estilos.marcaIcone}>
            <Image
              src="/logo-hope-select-icone.png"
              alt=""
              width={56}
              height={56}
              className={estilos.marcaImg}
            />
          </div>
          <h1 className={estilos.titulo}>Hope Select</h1>
          <p className={estilos.subtitulo}>Gestão de sala da academia</p>
        </div>

        <label className={estilos.campo}>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={estilos.input}
          />
        </label>

        <label className={estilos.campo}>
          Senha
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className={estilos.input}
          />
        </label>

        {estado?.erro && (
          <p className={estilos.erro} role="alert">
            {estado.erro}
          </p>
        )}

        <button type="submit" disabled={pendente} className={estilos.botao}>
          {pendente ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
