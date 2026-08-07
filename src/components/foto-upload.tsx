'use client'

import { useRef, useState } from 'react'
import { criarClienteBrowser } from '@/lib/supabase/client'
import { RecorteFotoModal } from '@/components/recorte-foto-modal'

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

async function paraJpegSeHeic(file: File): Promise<Blob> {
  const ehHeic =
    file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name)
  if (!ehHeic) return file
  await carregarScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js', 'heic2any')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heic2any = (window as any).heic2any
  const resultado = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  return Array.isArray(resultado) ? resultado[0] : resultado
}

function blobDeVideo(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao capturar'))), 'image/jpeg', 0.9),
  )
}

export function FotoUpload({
  bucket,
  nomeCampo,
  inicial,
}: {
  bucket: string
  nomeCampo: string
  inicial?: string | null
}) {
  const supabase = criarClienteBrowser()
  const [url, setUrl] = useState(inicial ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [camAberta, setCamAberta] = useState(false)
  const [arquivoParaRecortar, setArquivoParaRecortar] = useState<Blob | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function enviar(blob: Blob) {
    setEnviando(true)
    setErro(null)
    const caminho = `${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(bucket).upload(caminho, blob, { contentType: 'image/jpeg' })
    if (error) {
      setErro(error.message)
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(caminho)
      setUrl(data.publicUrl)
    }
    setEnviando(false)
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    try {
      const arquivoJpeg = await paraJpegSeHeic(file)
      setArquivoParaRecortar(arquivoJpeg)
    } catch {
      setErro('Não foi possível ler essa imagem. Tenta outro arquivo.')
    } finally {
      e.target.value = ''
    }
  }

  async function abrirCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
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
    const blob = await blobDeVideo(videoRef.current)
    fecharCamera()
    setArquivoParaRecortar(blob)
  }

  // Reabre o recorte numa foto que já está salva — busca o arquivo pela URL
  // pública (não precisa reenviar do zero). Útil pra fotos antigas que
  // foram cortadas antes de essa ferramenta existir.
  async function editarFotoAtual() {
    if (!url) return
    setErro(null)
    try {
      const resposta = await fetch(url)
      const blob = await resposta.blob()
      setArquivoParaRecortar(blob)
    } catch {
      setErro('Não foi possível carregar essa foto pra editar. Tenta enviar de novo.')
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={nomeCampo} value={url} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={editarFotoAtual}
          disabled={!url}
          title={url ? 'Clique pra ajustar o recorte' : undefined}
          className="h-16 w-16 shrink-0 rounded-full border border-gray-200 dark:border-gray-700 disabled:cursor-default"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url || '/window.svg'}
            alt=""
            className={`h-16 w-16 rounded-full object-cover ${url ? 'hover:opacity-75' : ''}`}
          />
        </button>
        <div className="flex flex-col gap-1 text-sm">
          <label className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            <span className="underline">Enviar arquivo</span>
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={aoEscolherArquivo} />
          </label>
          <button type="button" onClick={abrirCamera} className="text-left text-gray-700 dark:text-gray-300 underline hover:text-gray-900 dark:hover:text-gray-100">
            Tirar foto
          </button>
          {url && (
            <button
              type="button"
              onClick={editarFotoAtual}
              className="text-left text-gray-700 dark:text-gray-300 underline hover:text-gray-900 dark:hover:text-gray-100"
            >
              Editar recorte
            </button>
          )}
          {url && (
            <button type="button" onClick={() => setUrl('')} className="text-left text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              Remover
            </button>
          )}
        </div>
      </div>

      {enviando && <p className="text-xs text-gray-500 dark:text-gray-400">Enviando…</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {camAberta && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <video ref={videoRef} className="w-full max-w-xs rounded" playsInline muted />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={capturar} className="rounded-md bg-gray-900 dark:bg-brand-500 px-3 py-1.5 text-sm text-white">
              Capturar
            </button>
            <button type="button" onClick={fecharCamera} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {arquivoParaRecortar && (
        <RecorteFotoModal
          arquivo={arquivoParaRecortar}
          onConfirmar={(blob) => {
            setArquivoParaRecortar(null)
            void enviar(blob)
          }}
          onCancelar={() => setArquivoParaRecortar(null)}
        />
      )}
    </div>
  )
}
