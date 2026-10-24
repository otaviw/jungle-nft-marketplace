# Revisão visual: home e detalhe

## Referências e capturas

Os quatro PNGs de início/detalhe nas pastas `pages figma/Desktop` e `pages figma/Mobile` foram abertos antes da implementação. O Figma online não estava acessível neste ambiente. As capturas finais usam Chromium no preview do build otimizado, com `VITE_ENABLE_MOCKS=true`.

| Página | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| Home | [Mobile](../artifacts/visual-review/current/home-390.png) | [Tablet](../artifacts/visual-review/current/home-768.png) | [Desktop](../artifacts/visual-review/current/home-1440.png) |
| Detalhe | [Mobile](../artifacts/visual-review/current/detail-390.png) | [Tablet](../artifacts/visual-review/current/detail-768.png) | [Desktop](../artifacts/visual-review/current/detail-1440.png) |

O script `node scripts/visual-review.mjs` gera esses artefatos. São capturas para inspeção, ignoradas pelo Git, sem baselines definitivas. O diretório `before` registra o estado anterior à primeira revisão; `revision-2-before` preserva as capturas anteriores à segunda.

## Segunda revisão

A comparação foi feita com as referências à esquerda e capturas reais do Chromium à direita, sem redimensionar uma página para a largura da outra. Desktop usa 1440 px; mobile usa 414 px, como os PNGs fornecidos. Também foram abertas as capturas em 390 e 768 px. Esta rodada permanece restrita a home e detalhe.

| Diferença encontrada | Correção |
| --- | --- |
| Destaque lateral começava em 1290 px, cerca de 165 px acima da referência, com imagem quadrada | Início em 1460 px, próximo dos 1455 px da referência; área de imagem de 310×370 px, bloco com 466 px de altura |
| Título do hero desktop menor e navegação com corpo reduzido | Título de 44 para 48 px; navegação de 14 para 16 px, mantendo duas linhas no título |
| Cards editoriais desktop largos, footer com texto pequeno | Cards de 282 para 268 px; títulos do footer em 18 px e textos dos benefícios em 16 px |
| Botão de compra desktop tinha cerca de 225 px, ocupando espaço excessivo | Colunas explícitas de 130 px para comprar e favoritar; quantidade alinhada à esquerda; metadados e abas aproximados da posição da referência |
| Painel mobile do detalhe começava em 416 px | Início em 392 px em viewport de 414 px, coincidente com a referência; imagem sem miniaturas sobrepostas |
| Navegação mobile começava em 808 px e círculo central em 788 px | Barra em 800 px e círculo em 771 px; referência em aproximadamente 801 e 771 px |
| Hero mobile tinha fundo plano, quebras de texto e tabs muito espaçadas | Camadas curvas no fundo, título/descrição e quebras ajustadas; tabs agrupadas; padding dos cards alternados corrigido |
| Ícones de filtro, exploração e redes sociais destoavam | Formas vetoriais ajustadas; símbolos sociais continuam decorativos, sem integração ou sucesso fictício |

As miniaturas mobile foram movidas para o diálogo de ampliação. A imagem inteira abre o diálogo, e a seleção de recorte altera a visualização. Escape fecha e devolve o foco. O teste de galeria acompanha essa entrada, preservando as verificações de seleção, foco, edição, quantidade e navegação das abas.

Comparações finais inspecionadas:

- Home desktop: [hero e primeira linha](../artifacts/visual-review/comparison-after/home-desktop-top.png), [catálogo e destaque](../artifacts/visual-review/comparison-after/home-desktop-catalog.png), [seções inferiores](../artifacts/visual-review/comparison-after/home-desktop-bottom.png).
- Detalhe desktop: [galeria e compra](../artifacts/visual-review/comparison-after/detail-desktop-top.png), [relacionados e footer](../artifacts/visual-review/comparison-after/detail-desktop-related.png).
- Mobile em 414 px: [home](../artifacts/visual-review/comparison-after/home-mobile.png) e [detalhe](../artifacts/visual-review/comparison-after/detail-mobile.png).

Ainda existem diferenças: o desenho e as métricas da fonte são aproximados; as curvas do hero mobile não reproduzem exatamente o fundo original; a descrição, as edições e os metadados têm comprimentos diferentes; relacionados usam uma grade de cinco itens, sem a paginação ilustrada. O início do footer do detalhe permanece cerca de 40 px acima do PNG de referência. Não foram adicionados dados ou controles decorativos para compensar esses espaços.

Há quatro imagens reais para os 24 registros existentes nas fixtures. Nenhum asset foi criado, trocado ou renomeado nesta revisão. Na galeria, os recortes são da mesma obra, não NFTs diferentes; isso também está explicado no diálogo. Não há outras fotografias reais da obra para substituir esses recortes.

Arquivos alterados nesta segunda revisão:

- `src/marketplace.css`, `src/pages/nft-detail.tsx`.
- `src/components/home/hero.tsx`.
- `src/components/layout/marketplace-header.tsx`, `marketplace-footer.tsx`, `mobile-navigation.tsx`.
- `src/components/nft/nft-gallery.tsx`, `purchase-options.tsx`.
- `e2e/nft-gallery.spec.ts`.
- `scripts/visual-review.mjs`, `scripts/compare-visual.ps1`.
- `README.md`, `ARCHITECTURE.md`, `docs/visual-review.md`.

### Validação da segunda revisão

Lint e build com mocks aprovados. O build mantém o aviso de chunk acima de 500 kB (608,17 kB). Foram capturadas e inspecionadas as oito combinações de duas páginas com 390, 414, 768 e 1440 px no preview do build. Todas as imagens carregaram e a largura do documento coincidiu com o viewport; essas duas verificações são técnicas, não evidência de fidelidade.

Testes afetados: 38 execuções aprovadas em 4,5 minutos (19 desktop e 19 mobile), com um worker e sem outra execução concorrente do Playwright. Foram mantidas as assertions de comportamento, sem aumentar timeouts nem usar cliques forçados. Não foi executada a suíte inteira nesta rodada.

```sh
npm run test:e2e -- e2e/catalog.spec.ts e2e/nft-gallery.spec.ts e2e/account-cart.spec.ts e2e/consistency.spec.ts e2e/realtime.spec.ts e2e/mock-scenarios.spec.ts e2e/purchase.spec.ts
```

A seleção cobre catálogo/URL, galeria, favoritos, quantidade e edição, preço em tempo real, estados lentos/de erro e a continuidade da compra após os ajustes dos controles. Nenhum commit ou push foi feito.

## Conferência no navegador

| Página | Viewport | Largura do documento | Imagens |
| --- | --- | --- | --- |
| Home | 390 | 390 | Todas carregadas |
| Detalhe | 390 | 390 | Todas carregadas |
| Home | 414 | 414 | Todas carregadas |
| Detalhe | 414 | 414 | Todas carregadas |
| Home | 768 | 768 | Todas carregadas |
| Detalhe | 768 | 768 | Todas carregadas |
| Home | 1440 | 1440 | Todas carregadas |
| Detalhe | 1440 | 1440 | Todas carregadas |

Os resultados detalhados ficam em `artifacts/visual-review/current/checks.json`. Não foi aplicado corte horizontal no documento. Durante a inspeção foram corrigidos o empilhamento da compra mobile, o overflow causado pelo texto auxiliar de quantidade, o alinhamento da compra desktop, a quebra do título do hero e os espaços antes dos cards.

## Diferenças mantidas

- Fonte aproximada: Consolas, com fallback Liberation Mono, Courier New e monospace. O token `font/family` não resolve a família original. A renderização depende do sistema.
- Dados preservados: 24 NFTs, três categorias, duas edições e preços das fixtures. Isso mantém nomes, ordem, contagens, disponibilidade e metadados diferentes dos exemplos gráficos do Figma.
- A galeria oferece recortes da imagem fornecida; não há fotos alternativas reais de cada obra nos assets.
- Sem inventar dados: avaliações, atributos de raridade, contratos e transações reais não foram adicionados. A tela informa que não há avaliações.
- Sem intervalo de preço no contrato atual: há ordenação real por menor/maior preço, sem slider decorativo. “Novos lançamentos” e “Em alta” não prometem filtros sem dados de data/popularidade.
- Newsletter, redes sociais e leitura editorial não têm integrações. A composição existe, mas não há envio ou confirmação fictícios. Promoções e cards usam os destinos reais do catálogo.
- Os símbolos sociais do footer são simplificados; os logotipos originais não foram fornecidos nos assets.
- Não há frame de tablet: 768 px recebeu adaptação da composição desktop/mobile.

## Arquivos da primeira revisão

Estilos e páginas:

- `src/App.tsx`
- `src/index.css`
- `src/marketplace.css`
- `src/pages/nft-detail.tsx`

Componentes:

- `src/components/layout/marketplace-header.tsx`
- `src/components/layout/marketplace-footer.tsx`
- `src/components/layout/mobile-navigation.tsx`
- `src/components/home/hero.tsx`
- `src/components/home/catalog.tsx`
- `src/components/home/catalog-filters.tsx`
- `src/components/home/home-sections.tsx`
- `src/components/nft/nft-gallery.tsx`
- `src/components/nft/purchase-options.tsx`
- `src/components/nft/favorite-button.tsx`

Testes e captura:

- `e2e/catalog.spec.ts`
- `e2e/nft-gallery.spec.ts`
- `e2e/helpers.ts`
- `e2e/account-cart.spec.ts`
- `e2e/consistency.spec.ts`
- `e2e/realtime.spec.ts`
- `e2e/mock-scenarios.spec.ts`
- `scripts/visual-review.mjs`

Documentação e configuração:

- `.gitignore`
- `README.md`
- `ARCHITECTURE.md`
- `docs/superpowers/plans/2026-10-24-home-detail-visual.md`
- `docs/visual-review.md`

As páginas e o header de conta, carrinho e checkout não foram reorganizados. Apenas cores e tipografia compartilhadas afetam essas telas. Nenhuma dependência, asset ou camada de transporte foi substituída.

## Resultados da primeira revisão

- `npm run lint`: aprovado.
- `VITE_ENABLE_MOCKS=true` com `npm run build`: aprovado, com aviso de chunk acima de 500 kB.
- `node scripts/visual-review.mjs` no preview: aprovado nas seis combinações de página/largura.
- Testes afetados: 38 aprovados, 19 desktop e 19 mobile, em 4,6 minutos. Comando:

```sh
npm run test:e2e -- e2e/catalog.spec.ts e2e/nft-gallery.spec.ts e2e/account-cart.spec.ts e2e/consistency.spec.ts e2e/realtime.spec.ts e2e/mock-scenarios.spec.ts e2e/purchase.spec.ts
```

Essa execução cobre somente os arquivos indicados; não é uma declaração de aprovação da suíte inteira após a revisão visual. As assertions de comportamento foram mantidas e os seletores foram adaptados para busca no header, filtros mobile, edição por rádios e nomes acessíveis alinhados ao texto visível. Não foram aumentados timeouts nem usados cliques forçados.
