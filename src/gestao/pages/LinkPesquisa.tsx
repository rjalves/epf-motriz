import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function LinkPesquisa({ slug }: { slug: string }) {
  const url = `${location.origin}/responder/${slug}`
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => { QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#0E2640' } }).then(setQr) }, [url])
  return (
    <section className="epf-cartao epf-qr" aria-label="Link da pesquisa">
      {qr && <img className="epf-qr__imagem" src={qr} alt={`QR code do link da pesquisa: ${url}`} />}
      <div className="epf-pilha" style={{ flex: 1 }}>
        <b>Link da pesquisa para os estudantes</b>
        <span className="epf-qr__url">{url}</span>
        <div className="epf-linha">
          <button className="epf-btn epf-btn--primario epf-btn--p" onClick={() => { navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 3000) }}>
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
          {qr && <a className="epf-btn epf-btn--secundario epf-btn--p" href={qr} download={`EPF-${slug}-qrcode.png`}>Baixar QR code</a>}
          <a className="epf-btn epf-btn--fantasma epf-btn--p" href={url} target="_blank" rel="noreferrer">Ver como o estudante</a>
        </div>
      </div>
    </section>
  )
}
