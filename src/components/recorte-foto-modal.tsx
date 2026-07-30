'use client'

import { useEffect, useRef, useState } from 'react'

function carregarScript(src: string, chaveGlobal: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any)[chaveGlobal]) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = src
    tag.onload = () => resolve()
    tag.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.body.appendChild(tag)
  })
}

function carregarCss(href: string, id: string) {
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

const LADO_SAIDA = 480

export function RecorteFotoModal({
  arquivo,
  onConfirmar,
  onCancelar,
}: {
  arquivo: Blob
  onConfirmar: (blob: Blob) => void
  onCancelar: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropperRef = useRef<any>(null)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    let cancelado = false
    const objUrl = URL.createObjectURL(arquivo)

    async function iniciar() {
      try {
        carregarCss('https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.min.css', 'cropperjs-css')
        await carregarScript('https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.min.js', 'Cropper')
        if (cancelado || !imgRef.current) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Cropper = (window as any).Cropper
        imgRef.current.src = objUrl
        cropperRef.current = new Cropper(imgRef.current, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 1,
          cropBoxMovable: false,
          cropBoxResizable: false,
          toggleDragModeOnDblclick: false,
          background: false,
        })
        setPronto(true)
      } catch {
        if (!cancelado) setErro('Não foi possível abrir o editor de recorte.')
      }
    }

    void iniciar()

    return () => {
      cancelado = true
      cropperRef.current?.destroy()
      cropperRef.current = null
      URL.revokeObjectURL(objUrl)
    }
  }, [arquivo])

  // .zoomTo() define o zoom exato pro valor do controle (diferente de
  // .zoom(), que soma/subtrai em cima do zoom atual — por isso ele só
  // crescia antes, não importava pra qual lado você arrastasse o range).
  function aoMudarZoom(e: React.ChangeEvent<HTMLInputElement>) {
    cropperRef.current?.zoomTo(Number(e.target.value) / 100)
  }

  function confirmar() {
    if (!cropperRef.current) return
    setGerando(true)
    const canvas = cropperRef.current.getCroppedCanvas({
      width: LADO_SAIDA,
      height: LADO_SAIDA,
      imageSmoothingQuality: 'high',
    })
    canvas.toBlob(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (blob: any) => {
        setGerando(false)
        if (blob) onConfirmar(blob)
        else setErro('Falha ao gerar a imagem recortada.')
      },
      'image/jpeg',
      0.85,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Ajustar foto</h2>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-700" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="p-4">
          <p className="mb-3 text-xs text-gray-500">
            Arraste pra posicionar e ajuste o zoom. A área redonda é o que vai aparecer na bolinha.
          </p>

          <div className="recorte-circular mx-auto h-72 w-72 overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} alt="" className="block max-w-full" />
          </div>

          {!pronto && !erro && <p className="mt-3 text-center text-sm text-gray-400">Carregando editor…</p>}
          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          {pronto && (
            <div className="mt-4">
              <label className="text-xs text-gray-500">Zoom</label>
              <input type="range" min={100} max={300} defaultValue={100} onChange={aoMudarZoom} className="w-full" />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={confirmar}
              disabled={!pronto || gerando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {gerando ? 'Salvando…' : 'Usar essa foto'}
            </button>
            <button onClick={onCancelar} className="text-sm text-gray-500 hover:text-gray-900">
              Cancelar
            </button>
          </div>
        </div>

        <style jsx global>{`
          .recorte-circular .cropper-view-box,
          .recorte-circular .cropper-face {
            border-radius: 50%;
          }
        `}</style>
      </div>
    </div>
  )
}
