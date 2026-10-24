# Jungle NFT Marketplace

Implementação do [challenge de frontend da Jungle](https://github.com/junglegaming/frontend-challenge), com React, TypeScript e dados simulados no navegador. Catálogo, conta, carrinho, checkout e pedidos usam REST com MSW e eventos pelo cliente Socket.IO. Não há integração com blockchain ou pagamentos reais.

## Setup

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
| `npm run lint` | ESLint |
| `npm run test:e2e` | Toda a suíte Playwright, desktop e mobile |
| `npm run test:e2e -- e2e/profile-wallets.spec.ts` | Perfil, senha, avatar e carteiras |
| `npm run test:e2e -- e2e/mock-reset.spec.ts e2e/mock-scenarios.spec.ts e2e/realtime.spec.ts` | Reset, rede, estoque e reconexão; desktop e mobile |
| `npm run test:e2e:headed` | Testes com navegador visível |
| `npm run test:e2e:report` | Relatório HTML da última execução |

Instale o navegador dos testes uma vez com `npx playwright install chromium`. O Playwright gera o build com `VITE_ENABLE_MOCKS=true`, inicia preview em `127.0.0.1:4173` e executa Chromium em 1440×900 e 390×844. A porta precisa estar livre. Cada teste recebe um contexto novo de navegador. Relatórios ficam em `playwright-report/`; traces, vídeos e screenshots são retidos nas falhas em `test-results/`. Esses diretórios são ignorados pelo Git.

Não existem scripts separados de typecheck, reset ou Lighthouse. A checagem de tipos faz parte do build. A suíte atual não contém comparações com screenshots de referência.

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

`public/favicon.svg`, `public/icons.svg` e `public/mockServiceWorker.js` estão presentes. Geist Variable é importada de `@fontsource-variable/geist`; seus cinco arquivos WOFF2 são empacotados localmente pelo Vite. O CSS do `body` usa também `Courier New`, com fallback `monospace`, dependente do sistema. A tipografia e a composição visual não foram alteradas nesta revisão.

## Preparação para Vercel

`vercel.json` define preset Vite, build `npm run build` e saída `dist`. Na configuração do projeto, defina `VITE_ENABLE_MOCKS=true` para os ambientes de demonstração antes de construir. `.env.example` não é carregado automaticamente pelo Vite, e `.env.local` não deve ser versionado.

O fallback entrega `index.html` para as rotas da SPA, incluindo acesso direto e refresh de `/nfts/nft-001`, `/profile`, `/wallets`, `/cart`, `/checkout` e `/orders/:id`. A autenticação continua no Router. Os caminhos `/api`, `/assets`, `/images`, `/fonts` e os arquivos públicos nomeados ficam fora do fallback; arquivos ausentes nesses caminhos não devem retornar HTML da SPA. O worker recebe `Cache-Control: no-cache`. A configuração usa [rewrites da Vercel](https://vercel.com/docs/project-configuration/vercel-json), preservando os arquivos existentes.

Não foi feito deploy nem acesso a uma conta Vercel. Após publicar, validar por HTTPS: acesso direto e refresh, worker com conteúdo JavaScript, assets/fontes, MSW ativo e eventos Socket.IO. O preview local comprova o build, mas não executa as regras de hospedagem da Vercel.

## Pendências para a entrega

- Conferir a fidelidade das imagens existentes e da tipografia em relação ao Figma.
- Publicar a versão final e validar rotas, estáticos e mocks no domínio público.
- Fazer auditorias Lighthouse de início e detalhe, mobile e desktop, com três medições por combinação e medianas, LCP, CLS, TBT e relatórios HTML/JSON. Não há configuração nem resultados de Lighthouse entregues.
- Produzir screenshots estáveis de início, detalhe, carrinho e pagamento, versionar baselines e adicionar regressão visual. Capturas de falha do Playwright não substituem essas baselines.
- Completar a evidência de responsividade em 768 px, teclado, foco e demais cenários do enunciado sem cobertura nos testes existentes. Skeletons de catálogo, detalhe e carrinho já têm cobertura de lentidão.

O build atual passa, mas emite um aviso de chunk acima de 500 kB. Esse ponto deve entrar na análise de performance; não houve mudança de arquitetura ou ajuste do limite para ocultar o aviso.

Contratos, políticas de estado e limitações estão em [ARCHITECTURE.md](ARCHITECTURE.md).
