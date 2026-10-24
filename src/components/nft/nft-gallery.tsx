import { useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Nft } from '@/types/nft'

const views = [
    { id: 'full', label: 'Ver imagem completa' },
    { id: 'face', label: 'Ver detalhe do rosto' },
    { id: 'artwork', label: 'Ver detalhe da composição' },
    { id: 'close', label: 'Ver recorte aproximado' },
]

export function NftGallery({ nft }: { nft: Nft }) {
    const [selected, setSelected] = useState('full')
    const dialog = useRef<HTMLDialogElement>(null)
    return (
        <section className="nft-gallery" aria-label="Galeria do NFT">
            <div className="gallery-thumbnails">{views.map((view, index) => <button key={view.id} type="button" aria-label={view.label} aria-pressed={selected === view.id} onClick={() => setSelected(view.id)}><img src={nft.image} alt="" width={100} height={100} fetchPriority={index === 0 ? 'high' : undefined} data-view={view.id} /></button>)}</div>
            <button type="button" className="gallery-stage" aria-label="Ampliar imagem do NFT" onClick={() => dialog.current?.showModal()}>
                <img src={nft.image} alt={`${nft.name} — imagem principal`} width={450} height={450} fetchPriority="high" data-view={selected} />
                <span className="gallery-zoom" aria-hidden="true"><Search /></span>
            </button>
            <dialog ref={dialog} className="market-dialog image-dialog" aria-label={`Imagem ampliada de ${nft.name}`}>
                <button type="button" className="dialog-close" aria-label="Fechar imagem ampliada" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
                <div className="dialog-artwork"><img src={nft.image} alt={nft.name} width={800} height={800} data-view={selected} /></div>
                <div className="dialog-gallery-views">{views.map(view => <button key={view.id} type="button" aria-label={view.label} aria-pressed={selected === view.id} onClick={() => setSelected(view.id)}><img src={nft.image} alt="" width={60} height={60} data-view={view.id} /></button>)}</div>
                <p>Visualização · {nft.name}</p>
                <p className="gallery-asset-note">Os recortes mostram a mesma imagem. Não há outras fotografias desta obra nos assets fornecidos.</p>
            </dialog>
        </section>
    )
}
