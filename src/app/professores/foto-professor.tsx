'use client'

import { useRef, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'

const BUCKET = 'professores'
const MAX_LADO = 640 // redimensiona para no máximo 640px no maior lado

// Desenha a fonte (imagem ou frame de vídeo) em um canvas reduzido e devolve um JPEG.
function redimensionar(fonte: HTMLImageElement | HTMLVideoElement): Promise<Blob> {
  const w = fonte instanceof HTMLVideoElement ? fonte.videoWidth : fonte.naturalWidth
  const h = fonte instanceof HTMLVideoElement ? fonte.videoHeight : fonte.naturalHeight
  const escala = Math.min(1, MAX_LADO / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * escala)
  canvas.height = Math.round(h * escala)
  canvas.getContext('2d')!.drawImage(fonte, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))),
      'image/jpeg',
      0.85,
    ),
  )
}

export function FotoProfessor({ inicial }: { inicial?: string | null }) {
  const supabase = criarClienteBrowser()
  const [url, setUrl] = useState(inicial ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [camAberta, setCamAberta] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function enviar(blob: Blob) {
    setEnviando(true)
    setErro(null)
    const caminho = `${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, blob, { contentType: 'image/jpeg' })
    if (error) {
      setErro(error.message)
    } else {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
      setUrl(data.publicUrl)
    }
    setEnviando(false)
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objUrl
    try {
      await img.decode()
      await enviar(await redimensionar(img))
    } catch {
      setErro('Não foi possível ler a imagem.')
    } finally {
      URL.revokeObjectURL(objUrl)
      e.target.value = ''
    }
  }

  async function abrirCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setCamAberta(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setErro('Não foi possível acessar a câmera.')
    }
  }

  function fecharCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamAberta(false)
  }

  async function capturar() {
    if (!videoRef.current) return
    const blob = await redimensionar(videoRef.current)
    fecharCamera()
    await enviar(blob)
  }

  return (
    <div className="space-y-2">
      {/* o formulário continua lendo foto_url */}
      <input type="hidden" name="foto_url" value={url} />

      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url || '/window.svg'}
          alt=""
          className="h-16 w-16 rounded-full border border-gray-200 object-cover"
        />
        <div className="flex flex-col gap-1 text-sm">
          <label className="cursor-pointer text-gray-700 hover:text-gray-900">
            <span className="underline">Enviar arquivo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={aoEscolherArquivo}
            />
          </label>
          <button
            type="button"
            onClick={abrirCamera}
            className="text-left text-gray-700 underline hover:text-gray-900"
          >
            Tirar foto
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="text-left text-gray-400 hover:text-gray-900"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {enviando && <p className="text-xs text-gray-500">Enviando…</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {camAberta && (
        <div className="rounded-lg border border-gray-200 p-2">
          <video ref={videoRef} className="w-full max-w-xs rounded" playsInline muted />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={capturar}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white"
            >
              Capturar
            </button>
            <button
              type="button"
              onClick={fecharCamera}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
