'use client'

import { useEffect, useState } from 'react'

export function ehModoEscuro(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

// Gráficos Chart.js não são componentes React de verdade — não
// re-renderizam sozinhos quando alguém aperta o botão de tema. Esse hook
// dispara um novo valor toda vez que a classe "dark" do <html> muda,
// pra ser usado como dependência de um useEffect que reconstrói o gráfico.
export function useTemaObservado(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setTick((t) => t + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return tick
}
