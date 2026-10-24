# Jungle NFT Marketplace

Implementação do [challenge de frontend da Jungle](https://github.com/junglegaming/frontend-challenge), com React, TypeScript e dados simulados no navegador. Catálogo, conta, carrinho, checkout e pedidos usam REST com MSW e eventos pelo cliente Socket.IO. Não há integração com blockchain ou pagamentos reais.

## Setup

URL pública informada para a entrega: [kurio-nft-pied.vercel.app](https://kurio-nft-pied.vercel.app/). A versão local desta etapa não foi republicada nem comparada com esse deploy.

Ambiente validado com Node.js 22.19 e npm. Instale as versões do lockfile:

```sh
npm ci
```

Copie `.env.example` para `.env.local`. No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Mantenha `VITE_ENABLE_MOCKS=true` e execute:

```sh
npm run dev
```

Abra a URL exibida pelo Vite. Use localhost ou HTTPS: o bootstrap depende de service worker e Web Crypto e aguarda os mocks antes de renderizar.

`VITE_ENABLE_MOCKS` é a única variável lida pela aplicação. O valor precisa ser a string `true`. Sem ela, o MSW não inicia; não há backend incluído para esse modo. A variável é incorporada durante o build, portanto alterar seu valor exige outro build. Variáveis `VITE_*` são públicas e não devem conter segredos.

## Contas e compra de demonstração

| E-mail fictício | Senha inicial |
| --- | --- |
| `demo@kurio.test` | `Kurio123!` |
| `outro@kurio.test` | `Kurio123!` |

As contas são criadas se ainda não existirem. Alterações de perfil e senha persistem no navegador; refresh não restaura as credenciais iniciais.

Para comprar: entre, cadastre a carteira principal em `/wallets`, adicione a edição padrão de `/nfts/nft-001` ao carrinho e vá ao pagamento. Selecione e conecte a carteira simulada, revise e confirme. Um endereço fictício válido para Ethereum é `0x1111111111111111111111111111111111111111`. A confirmação só aparece quando o pedido chega a `confirmed`.

O cupom `KURIO10` dá 10% de desconto. `EXPIRADO` reproduz cupom expirado; outro código não vazio reproduz cupom inválido. Código vazio remove o cupom.

## Comandos existentes

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor Vite; lê `.env.local` |
| `npm run build` | Verificação de tipos com `tsc -b` e build Vite em `dist/` |
| `npm run preview` | Servir o build localmente; não gera outro build |
| `npm run audit:lighthouse` | Build com mocks e 12 auditorias Lighthouse sequenciais; HTML/JSON, validações e medianas em `artifacts/lighthouse/` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Toda a suíte Playwright, desktop e mobile |
| `npm run test:e2e -- e2e/profile-wallets.spec.ts` | Perfil, senha, avatar e carteiras |
| `npm run test:e2e -- e2e/mock-reset.spec.ts e2e/mock-scenarios.spec.ts e2e/realtime.spec.ts` | Reset, rede, estoque e reconexão; desktop e mobile |
| `npm run test:e2e:headed` | Testes com navegador visível |
| `npm run test:e2e:report` | Relatório HTML da última execução |

Instale o navegador dos testes uma vez com `npx playwright install chromium`. O Playwright gera o build com `VITE_ENABLE_MOCKS=true`, inicia preview em `127.0.0.1:4173` e executa Chromium em 1440×900 e 390×844. A porta precisa estar livre. Cada teste recebe um contexto novo de navegador. Relatórios ficam em `playwright-report/`; traces, vídeos e screenshots são retidos nas falhas em `test-results/`. Esses diretórios são ignorados pelo Git.

Não existem scripts separados de typecheck ou reset. A checagem de tipos faz parte do build. A suíte atual não contém comparações com screenshots de referência.

## Auditorias Lighthouse

Requer Node.js >=22.19, dependências do lockfile (`npm ci`) e Chrome instalado. Para indicar outro executável Chromium compatível, defina `CHROME_PATH`. Execute sem testes Playwright simultâneos e com a porta 4175 livre:

```sh
npm run audit:lighthouse
```

No PowerShell com bloqueio de scripts, use `npm.cmd run audit:lighthouse`. O comando faz o build de produção com `VITE_ENABLE_MOCKS=true` explicitamente, inicia o preview em `http://127.0.0.1:4175` e audita `/` e `/nfts/nft-001` três vezes em cada perfil (mobile padrão Lighthouse e preset desktop), sequencialmente. A configuração está em `scripts/lighthouse.config.mjs`; Lighthouse, Puppeteer Core e Chrome Launcher têm versões fixadas no lockfile.

Cada medição usa um perfil Chrome novo, cache/storage limpos e throttling simulado do respectivo perfil. Não altera latências dos mocks, animações, conteúdo ou funcionalidades. Depois da navegação medida, valida MSW, cenário padrão, catálogo com 24 NFTs, detalhe Emerald Ape, imagens decodificadas e a fonte efetivamente renderizada pelo Chrome. A rolagem para imagens lazy e as chamadas extras de validação ocorrem após a auditoria. O CSS atual usa fontes de sistema (Consolas e alternativas monospace); a importação de Geist permanece sem download quando não utilizada.

Os arquivos ficam em `artifacts/lighthouse/<data-hora-UTC>/`:

- `home-{mobile|desktop}-{1|2|3}.{html|json}` e `nft-001-{mobile|desktop}-{1|2|3}.{html|json}`: 12 pares de relatórios completos.
- `*.validation.json`: evidências de conteúdo e recursos por medição.
- `summary.md` e `summary.json`: medianas independentes de Performance, Accessibility, Best Practices, SEO, LCP, CLS e TBT; metas por categoria.
- `runs.json` e `environment.json`: valores individuais, versões, hardware/OS, Chrome, emulação, throttling, avisos e condições efetivas.
- `build.log` e `build-sha256.json`: saída do build e hashes dos arquivos servidos.

Metas: Performance/SEO >=90 e Accessibility/Best Practices >=95. Resultado abaixo da meta é reportado, sem invalidar a medição ou modificar a aplicação. Erros de execução/carregamento interrompem o comando com código não zero e `failure.json`; execuções incompletas não produzem resumo de 12 auditorias válidas. O preview local não comprova HTTPS, cabeçalhos ou regras do deploy público. Fontes de sistema e condições da máquina podem mudar os resultados em outro ambiente.

Resultados de 24/10/2026, evidências e causas dos resultados abaixo das metas: [análise das auditorias](docs/lighthouse-audit.md). Para verificar relatórios salvos sem abrir navegador: `node scripts/verify-lighthouse.mjs artifacts/lighthouse/<execução>`; acrescente `--check-build` para conferir também o `dist` atual contra os hashes auditados.

Medianas finais do snapshot auditado, três medições por combinação:

| Página/perfil | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home mobile | 83 | 100 | 100 | 92 |
| Detalhe mobile | 87 | 100 | 100 | 92 |
| Home desktop | 99 | 100 | 100 | 92 |
| Detalhe desktop | 99 | 100 | 100 | 92 |

**Performance mobile ficou abaixo da meta 90 nas duas páginas.** [Resumo com LCP, CLS e TBT](artifacts/lighthouse/2026-10-24T20-18-35.247Z/summary.md), [medianas JSON](artifacts/lighthouse/2026-10-24T20-18-35.247Z/summary.json) e exemplos HTML: [Home mobile](artifacts/lighthouse/2026-10-24T20-18-35.247Z/home-mobile-1.html), [detalhe mobile](artifacts/lighthouse/2026-10-24T20-18-35.247Z/nft-001-mobile-1.html). Os 12 pares HTML/JSON, ambiente e configuração estão reunidos também no [anexo de entrega](artifacts/kurio-lighthouse-final.zip). Os arquivos estão no working tree e no anexo; como não houve commit/push, sua publicação no repositório remoto depende da entrega. Os links são relativos, sem dependência de caminhos `C:/`.

A correção atual do cabeçalho é posterior ao snapshot Lighthouse e não foi reauditada. O relatório histórico registra a tentativa anterior revertida; ela foi substituída nesta rodada pela reutilização validada do menu mobile. Foram executados lint, build e uma conferência de navegador somente do cabeçalho; não houve Lighthouse nem suíte completa nesta rodada. Uma autorização de testes havia sido recusada anteriormente; a conferência atual foi autorizada e executada.

## Cenários disponíveis

Execute os trechos abaixo no console do navegador com a aplicação aberta e os mocks ativos. Eles controlam os handlers MSW e não funcionam por `curl`, pois não há servidor REST real. Para desativar uma flag persistente, remova sua chave com `localStorage.removeItem(...)`.

| Cenário | Como reproduzir |
| --- | --- |
| Resultado vazio | Buscar um nome inexistente no catálogo |
| NFT inexistente | Abrir `/nfts/inexistente` |
| Edição esgotada | Edição limitada de `nft-001` inicia com estoque zero |
| Cadastro em conflito | Cadastrar um e-mail que já existe |
| Erro de perfil | Salvar ENS sem `.eth` ou e-mail da outra conta |
| Erro de carteira | Endereço inválido ou repetir endereço/rede nos dois espaços |
| Rollback de favorito | `localStorage.setItem('kurio:scenario:favorite-failure', 'true')`; a próxima alteração responde 503 e consome a flag |
| Conexão de carteira recusada | `localStorage.setItem('kurio:scenario:connection', 'declined')`; depois conectar no checkout |
| Pagamento recusado | `localStorage.setItem('kurio:scenario:payment', 'declined')` antes de criar o pedido; o resultado é fixado na criação |
| Timeout após criar pedido | `localStorage.setItem('kurio:scenario:order-timeout', 'true')`; confirmar, aguardar o timeout, recarregar, remover a flag e usar “Recuperar pedido” |
| Eventos do catálogo pausados | `localStorage.setItem('kurio:scenario:pause-catalog-events', 'true')`; permite verificar reconciliação REST ao reconectar |

Para expirar a sessão atual:

```js
await fetch('/api/auth/expire', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
  },
})
```

A próxima consulta privada ou verificação periódica detecta a expiração. Para mudar preço com um NFT no carrinho ou no checkout:

```js
await fetch('/api/scenarios/nfts/nft-001/price', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ editionId: 'standard', price: '4.25' }),
})
```

O mock observa a versão e emite `nft.updated` pelo Socket.IO. Para interromper uma conexão assinada:

```js
window.dispatchEvent(new CustomEvent('kurio:scenario:realtime', {
  detail: { action: 'disconnect', scope: 'catalog' },
}))
```

O escopo também pode ser `order` na página de pedido. Para testar interrupção durante um pedido pendente, dispare com esse escopo enquanto a página mostra “Aguardando confirmação”. A reconexão refaz a assinatura e consulta o mesmo pedido por REST, sem outro POST. O teste em `e2e/realtime.spec.ts` fixa o relógio para manter o pedido pendente até depois da reconexão e então libera sua confirmação.

O controle também aceita `{ action: 'probe', scope: 'catalog', handled: 0 }` para detectar assinaturas e `{ action: 'order-event', orderId, version }` para emitir versões duplicadas ou antigas de um pedido assinado. Ele instrui o mock a enviar pelo transporte, sem alterar diretamente o cache da interface.

### Lentidão, latência variável e falhas de rede

`PUT /api/scenarios/network` configura as consultas de um recurso: `catalog` (`GET /nfts`), `detail` (`GET /nfts/:id`) ou `cart` (`GET /cart`). Por exemplo, para observar os skeletons do catálogo:

```js
await fetch('/api/scenarios/network', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resource: 'catalog', delaysMs: [3000] }),
})
window.location.assign('/')
```

Os controles são sequências consumidas na ordem de chegada ao MSW, incluindo requests canceladas e refetch em segundo plano. `delaysMs: [1800, 100]` faz a primeira consulta demorar mais que a segunda; o último atraso se repete nas seguintes. Não há sorteio. Cada atraso deve ser inteiro de 0 a 8000 ms, com até 50 passos. Sem `delaysMs`, vale o atraso original do handler. O cursor é persistido e não reinicia no refresh; outro PUT reinicia apenas o recurso informado.

Para falha de conexão com recuperação, use:

```js
await fetch('/api/scenarios/network', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resource: 'catalog',
    delaysMs: [100],
    failures: ['network', 'network'],
  }),
})
window.location.assign('/')
```

`network` usa `HttpResponse.error()`; `http-503` retorna HTTP 503. `null` representa sucesso num passo intermediário. Após consumir `failures`, as consultas voltam ao comportamento normal. A sequência pode ter até 50 passos. As duas falhas do exemplo incluem o único retry automático da consulta; o erro fica visível e “Tentar novamente” recupera o catálogo. Uma falha só pode ser recuperada automaticamente pelo retry.

Use `DELETE /api/scenarios/network` para remover todas as sequências de rede, sem apagar os dados de negócio. Os demais handlers mantêm suas latências originais, entre 200 e 700 ms nos fluxos principais. O timeout de pedido continua com seu controle próprio: 11 segundos, acima dos 10 segundos do Axios. Não há painel visual de cenários. A expiração determinística de cotação continua em `e2e/quote-expiration.spec.ts`.

### Edição esgotada durante a compra

Depois de adicionar `nft-001` e revisar o checkout:

```js
await fetch('/api/scenarios/nfts/nft-001/availability', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ editionId: 'standard', available: 0 }),
})
```

`available` é a disponibilidade atual, inteira de 0 a 10000. A alteração persiste no refresh e emite `nft.updated` pela mesma integração Socket.IO usada nos preços. O checkout descarta a revisão e exige outra cotação; estoque insuficiente retorna 409. O carrinho preserva os itens e informa a disponibilidade alterada. É possível repor o estoque pelo mesmo endpoint; vendas anteriores não são descontadas novamente do valor informado.

### Reset integral

Com os mocks ativos, execute no console. Feche outras abas da aplicação antes, para não manter escritas e drafts de outra aba:

```js
const response = await fetch('/api/scenarios/reset', { method: 'POST' })
if (!response.ok) throw new Error('Não foi possível solicitar o reset.')
const { reload } = await response.json()
window.location.assign(reload)
```

A recarga faz parte da operação. O POST limpa somente chaves `kurio:` de `localStorage` e `sessionStorage` e marca o reset pendente. No bootstrap seguinte, a limpeza é repetida antes de criar as contas: isso elimina também escritas tardias da página anterior. O cenário só está pronto quando a nova página termina de carregar.

São restaurados os dois usuários e senhas iniciais, catálogo, preços e estoque. Favoritos, carrinhos de visitante e usuários, carteiras/conexões, perfil/avatar, sessões, cotações, pedidos, tentativas de compra, drafts e todas as flags/sequências são apagados. A recarga descarta estado em memória, cache, requests, timers e subscriptions antigos. O worker permanece instalado. IDs dos usuários e salts são recriados; o cenário funcional inicial é o mesmo em resets consecutivos. Dados sem o prefixo do projeto são preservados.

## Assets

Os quatro arquivos referenciados pelas fixtures e pelas telas estão presentes:

- `public/images/nfts/emerald-ape.png`
- `public/images/nfts/sage-nomad.png`
- `public/images/nfts/neon-vessel.png`
- `public/images/nfts/golden-beat.png`

As duas primeiras imagens também aparecem no hero. As quatro são reutilizadas pelos 24 NFTs e seguem para detalhe, carrinho, cotação e recibo. Os arquivos existentes têm cabeçalho PNG: Emerald Ape em 450×450 e os demais em 250×250. A correspondência com o Figma ainda exige conferência visual. Nenhuma imagem foi alterada nesta tarefa.

`public/favicon.svg`, `public/icons.svg` e `public/mockServiceWorker.js` estão presentes. Geist Variable continua importada de `@fontsource-variable/geist`, com seus cinco WOFF2 locais. A interface usa a aproximação monoespaçada `Consolas, Liberation Mono, Courier New, monospace`. O token `font/family` do Figma não identifica uma família real; não foi tratado como nome de fonte nem motivou o download de uma fonte presumida. A aparência pode variar conforme as fontes do sistema.

## Revisão visual de home e detalhe

As referências usadas estão em `pages figma/Desktop` e `pages figma/Mobile`: início e detalhes do NFT. O link do Figma não pôde ser consultado neste ambiente; a composição foi comparada com os PNGs fornecidos. O conteúdo desktop tem largura máxima de 1200 px; foram conferidas também as larguras de 390 e 768 px.

Home e detalhe usam o header e footer do marketplace. Carrinho, checkout e recibo agora reutilizam esses componentes; as telas de conta mantêm suas composições anteriores. As mudanças compartilhadas ficam nos tokens de cor e tipografia. Busca, filtros e paginação continuam na URL, e a escolha de edição usa rádios no formato de pills. O botão “Comprar NFT” continua adicionando ao carrinho; não confirma uma compra.

A galeria tem quatro recortes da própria imagem e ampliação em diálogo, com Escape e retorno do foco. Miniaturas ficam ao lado da obra no desktop e no diálogo no mobile; não há fotografias alternativas fornecidas. Avaliações vêm de `GET /api/nfts/:id/reviews`, com autores fictícios e média/total derivados das notas; o NFT principal tem 19 avaliações e média 4,8. Não há publicação de comentários nem blockchain real. Newsletter e leitura editorial não enviam inscrições nem simulam sucesso.

Para gerar capturas de revisão e conferir carregamento de imagens e largura da página, inicie o Vite na porta usada pelo script:

```sh
npm run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

Em outro terminal:

```sh
node scripts/visual-review.mjs
```

As capturas de home e detalhe em 390, 768 e 1440 px e `checks.json` ficam em `artifacts/visual-review/current/`, ignorado pelo Git. No mobile, há também a versão da página inteira. `VISUAL_REVIEW_URL` permite apontar para outro servidor, incluindo o preview do build; `VISUAL_REVIEW_WIDTHS=390,414,768,1440` inclui a largura de 414 px das referências mobile. `VISUAL_REVIEW_OUTPUT` escolhe a subpasta de saída. O relatório JSON inclui medidas dos principais blocos. Execute essa revisão sem outro Playwright em andamento. São artefatos de inspeção, sem baselines definitivas.

No Windows, `scripts/compare-visual.ps1` monta os PNGs de referência e implementação lado a lado, na mesma escala. Recebe `-CaptureFolder` e `-OutputFolder`, relativos a `artifacts/visual-review`. A segunda revisão usa `revision-2-before` para o estado anterior e `comparison-after` para a comparação final. Essas imagens foram inspecionadas separadamente em desktop e mobile; carregamento de assets e largura do documento são verificações técnicas adicionais, não medidas de fidelidade visual.

Diferenças ainda conhecidas: a fonte exata não foi identificada; o catálogo usa as categorias, duas edições e 24 NFTs das fixtures. “Em alta” e “Novos lançamentos” usam popularidade e datas determinísticas simuladas. A API aceita `minPrice`/`maxPrice` inclusivos com precisão de wei, combinados com os demais filtros e paginação. A composição de 768 px é uma adaptação, sem frame específico de tablet.

Capturas, medidas e lista dos arquivos alterados estão em [docs/visual-review.md](docs/visual-review.md).

### Carrinho, checkout e recibo

Carrinho e checkout seguem os frames de `Carrinho de NFTs.png` e `Pagamento.png`, nas versões desktop e mobile. Não há frame específico de recibo na pasta; sua composição usa o mesmo resumo, tipografia e identidade, com estados pendente, confirmado, recusado e erro de consulta.

No checkout, nome e e-mail iniciais vêm de `GET /api/profile`. Um draft existente tem prioridade e continua em `sessionStorage`, separado por usuário. Os demais campos mostram os dados da carteira cadastrada selecionada: apelido, rede, nome do perfil, endereço, provedor, indicação e ENS. São leituras; o link de edição leva a `/wallets`. O campo “Outra carteira” mostra o outro cadastro, quando existe. Não há envio de campos decorativos, nem alteração automática do perfil ou da carteira.

A carteira principal é selecionada inicialmente; uma conexão existente ou escolha salva no draft tem prioridade. Os botões de provedor selecionam uma carteira já cadastrada desse tipo. Provedores sem cadastro ficam indisponíveis. Conectar, revisar a cotação e confirmar continuam sendo etapas distintas e simuladas. O resumo anterior à revisão é uma estimativa do carrinho; a cotação revisada contém a taxa da carteira escolhida. O recibo usa `order.collector` e `order.snapshot`, sem consultar o cadastro atual para reescrever uma compra passada. Os contratos REST não precisaram mudar.

No mobile, “Ver NFTs e taxas” expande o resumo e “Dados do colecionador” expande o perfil. Dados inválidos reabrem o perfil e recebem foco antes de permitir a revisão. A barra de ações tem espaço reservado; em altura disponível de até 500 px, volta ao fluxo para evitar cobrir o formulário. A ordem do DOM acompanha a composição mobile e os campos não usam `tabindex` positivo.

`node scripts/commerce-review.mjs` captura as três telas em 390, 414, 768 e 1440 px, além de estados vazio, carregando, erro e recusado em 390/1440. O setup das capturas usa os endpoints MSW com usuários fictícios, sem alterar fixtures. Saída: `artifacts/visual-review/commerce-current`. `scripts/compare-commerce.ps1` monta as comparações lado a lado com os quatro frames fornecidos. Os scripts aceitam `VISUAL_REVIEW_URL`, `VISUAL_REVIEW_WIDTHS` e `VISUAL_REVIEW_OUTPUT`.

`node scripts/audit-horizontal.mjs` verifica as bordas dos elementos e a largura do documento em 390, 414 e 768 px, com filtros, diálogos de conta/autenticação/galeria e seções do checkout abertas. Inclui gestos de toque horizontais e registra `scrollX`. `VISUAL_REVIEW_BROWSER` permite indicar um executável Chromium compatível, como Opera GX, sempre com perfil temporário isolado. Resultados e limitações da revisão ficam em [docs/commerce-review.md](docs/commerce-review.md). Não há corte horizontal aplicado a `html` ou `body` para ocultar conteúdo.

## Preparação para Vercel

`vercel.json` define preset Vite, build `npm run build` e saída `dist`. Na configuração do projeto, defina `VITE_ENABLE_MOCKS=true` para os ambientes de demonstração antes de construir. `.env.example` não é carregado automaticamente pelo Vite, e `.env.local` não deve ser versionado.

O fallback entrega `index.html` para as rotas da SPA, incluindo acesso direto e refresh de `/nfts/nft-001`, `/profile`, `/wallets`, `/cart`, `/checkout` e `/orders/:id`. A autenticação continua no Router. Os caminhos `/api`, `/assets`, `/images`, `/fonts` e os arquivos públicos nomeados ficam fora do fallback; arquivos ausentes nesses caminhos não devem retornar HTML da SPA. O worker recebe `Cache-Control: no-cache`. A configuração usa [rewrites da Vercel](https://vercel.com/docs/project-configuration/vercel-json), preservando os arquivos existentes.

A URL pública informada é [kurio-nft-pied.vercel.app](https://kurio-nft-pied.vercel.app/). Não houve acesso à conta Vercel nem novo deploy nesta etapa. Permanece necessário conferir no domínio público o snapshot entregue, acesso direto e refresh, worker JavaScript, assets/fontes, MSW e Socket.IO. O preview local não executa as regras de hospedagem da Vercel.

## Pendências para a entrega

- Conferir a fidelidade das imagens existentes e da tipografia em relação ao Figma.
- Confirmar que a URL pública contém a versão final e validar rotas, estáticos e mocks no domínio público.
- Tratar Performance mobile abaixo de 90 na [comparação antes/depois do Lighthouse](docs/lighthouse-audit.md): Home 83 e detalhe 87; Accessibility chegou a 100 nas quatro combinações. O cabeçalho foi corrigido e conferido posteriormente, sem nova auditoria.
- Produzir screenshots estáveis de início, detalhe, carrinho e pagamento, versionar baselines e adicionar regressão visual. Capturas de falha do Playwright não substituem essas baselines.
- Completar os cenários de responsividade/acessibilidade ainda não cobertos. O cabeçalho foi conferido em 390, 768, 1024 e 1440 px e na transição 1199/1200 px, com teclado, foco, busca, carrinho/conta e ausência de overflow; isso não valida todas as páginas. Skeletons de catálogo, detalhe e carrinho têm cobertura de lentidão.

O build atual passa sem o aviso anterior de chunk acima de 500 kB. As páginas usam divisão de código por rota; o limite não foi aumentado. O custo de bootstrap/mocks e a meta de Performance mobile continuam pendentes.

Baselines automatizadas de screenshots: não foram encontrados arquivos de baseline em `e2e/`, nem chamadas `toHaveScreenshot`/`toMatchSnapshot` na suíte atual. Há capturas manuais em `artifacts/visual-review/current`, `comparison-after`, `commerce-current` e pastas correlatas, ignoradas pelo Git; são revisões, não baselines automatizadas. Os testes funcionais de filtros, avaliações, carrosséis e compra continuam existentes; a conferência atual não executou novamente a suíte completa.

Contratos, políticas de estado e limitações estão em [ARCHITECTURE.md](ARCHITECTURE.md).

### Navegação, visualizações e favoritos

O header desktop acompanha a rolagem e indica a seção visível. Links para seções
continuam operáveis quando o hash já está na URL. Filtros, ordenação, abas e
paginação preservam o scroll, sem recarregar o documento.

A partir de 1200 px, o header mantém a linha desktop com Início, Mercado, Criadores e Aprenda. Abaixo desse limite, o acionador compacto reutiliza `MobileNavigation` e seu diálogo nativo com as quatro opções, carrinho e conta. Em 390 px a busca continua no header e a barra inferior permanece; em 768/1024 px permanecem as ações da linha superior. Escape fecha o diálogo e devolve o foco. Os estilos novos usam Tailwind; a composição de 1440 px foi preservada.

O hero mantém autoavanço, pontinhos manuais e pausa/retomada visível somente ao foco de teclado, sem deslocar o layout; movimento reduzido desativa o autoavanço. Os relacionados usam scroll horizontal com páginas de 2/3/5 cards conforme a largura, pontinhos, setas/Home/End e alinhamento da paginação no resize. As abas do detalhe mostram informações e avaliações. Nenhum desses componentes foi alterado nesta correção do header.

Coleção e rede usam rádios nativos estilizados; a ordenação usa o Select shadcn.
`view=all|new|trending` seleciona a visualização do catálogo. As fixtures possuem
`listedAt` e `popularity` determinísticos: novos lançamentos correspondem aos seis
dias mais recentes do conjunto de fixtures; em alta usa popularidade simulada
quando a ordenação é “Listados recentemente”. A ordenação explícita por preço
continua disponível nas três visualizações.

`favorites=true` consulta somente favoritos pela API autenticada, antes de paginar.
O filtro combina com busca, coleção, rede, visualização e ordenação. O coração da
navegação mobile abre essa consulta; visitantes passam pelo login e retomam a
intenção. A listagem tem chave de cache por usuário e é invalidada ao alterar
favoritos; o cache privado dessa consulta é removido na troca/saída da sessão.
Perfil e carteiras oferecem saída explícita para o catálogo no mobile.

Os testes direcionados estão em `e2e/navigation-fixes.spec.ts` e `e2e/catalog.spec.ts`.
