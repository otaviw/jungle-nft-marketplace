import { Link } from '@tanstack/react-router'
import { parseCatalogSearch } from '@/lib/catalog-search'

const socialMarks = [
    <path d="M14 21v-8h3l.5-4H14V7c0-1 .4-2 2-2h2V1h-3c-4 0-6 2-6 6v2H6v4h3v8z" />,
    <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="18" cy="6" r="1" /></>,
    <path d="M22 5a8 8 0 0 1-2.4.7A4 4 0 0 0 21.4 3a8 8 0 0 1-2.6 1 4 4 0 0 0-7 2.7c0 .3 0 .6.1.9A11.4 11.4 0 0 1 3.6 3.4a4 4 0 0 0 1.2 5.4A4 4 0 0 1 3 8.3v.1a4 4 0 0 0 3.2 4 4 4 0 0 1-1.8.1A4 4 0 0 0 8.2 15 8 8 0 0 1 2 16.7 11.3 11.3 0 0 0 19.4 7a8 8 0 0 0 2-2z" />,
    <><circle cx="5" cy="5" r="2" /><path d="M3 9h4v12H3zM10 9h4v2c1-2 7-4 7 3v7h-4v-6c0-3-3-3-3 0v6h-4z" /></>,
    <><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m10 9 6 3-6 3z" /></>,
]

export function MarketplaceFooter() {
    return (
        <footer className="marketplace-footer market-container">
            <div className="footer-benefits" id="criadores">
                {[
                    ['W', 'Segurança da carteira', 'Proteja sua carteira e colecione arte digital verificada com confiança.'],
                    ['C', 'Criadores em destaque', 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.'],
                    ['D', 'Alertas de lançamentos', 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.'],
                ].map(([icon, title, description]) => <div className="footer-benefit" key={icon}><span className="benefit-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p></div>)}
                <div className="newsletter"><h3>Antecipe-se ao próximo lançamento</h3><label htmlFor="newsletter-email" className="sr-only">E-mail para novidades</label><div className="newsletter-input"><input id="newsletter-email" type="email" placeholder="digite seu e-mail..." disabled /><button type="button" disabled>Enviar</button></div><p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p><small>Inscrições indisponíveis nesta demonstração.</small></div>
            </div>
            <div className="footer-brand"><span className="brand">KURIO</span><p>Feito para colecionadores,<br />criadores e cultura</p><span>contato@email.com</span><span>+55 11 4002 8922</span></div>
            <div className="footer-links">
                <div><h3>Meu perfil</h3><Link to="/profile">Meu perfil</Link><Link to="/wallets">Minhas carteiras</Link><span>Atividade</span><span>Estúdio do criador</span><span>Lista de interesse</span></div>
                <div><h3>Central de ajuda</h3><span>Central de ajuda</span><span>Como comprar NFTs</span><span>Carteira e segurança</span><span>Política do mercado</span><span>Denunciar item</span></div>
                <div><h3>Coleções</h3>{['Arte digital', 'Colecionáveis', 'Arte 3D'].map(category => <Link key={category} to="/" search={parseCatalogSearch({ category })} hash="catalogo">{category}</Link>)}</div>
                <div><h3>Redes sociais</h3><p className="social-list" aria-label="Redes sociais sem integração nesta demonstração">{socialMarks.map((mark, index) => <span key={index} aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor">{mark}</svg></span>)}</p><h3 className="wallets-heading">Carteiras compatíveis</h3><p className="wallet-brands">METAMASK · WALLETCONNECT · COINBASE</p></div>
            </div>
            <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
        </footer>
    )
}
