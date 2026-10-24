# Arquitetura

## Organização

A aplicação é uma SPA React com TypeScript e Vite. Telas ficam em `src/pages`, componentes em `src/components` e os componentes de UI em `src/components/ui`, com Tailwind e shadcn/ui. `src/router.tsx` declara as rotas com TanStack Router. TanStack Query mantém estado remoto; as chamadas REST passam pelo Axios de `src/lib/api.ts`, com base `/api` e timeout de 10 segundos.

`src/types` define contratos de transporte. Zod valida formulários, parâmetros e eventos em pontos específicos; nem toda resposta Axios tem validação de runtime. Handlers e stores em `src/mocks` simulam a API e persistem os dados no navegador. O bootstrap só importa e inicia essa camada quando `VITE_ENABLE_MOCKS === 'true'`, inclusive no build de demonstração. As páginas não retornam fixtures como alternativa à API. O Router usa `lazyRouteComponent` para dividir as páginas, mantendo `beforeLoad`, validação de search e proteção de sessão.

Não há servidor de produção neste repositório. Persistência e autorização dos mocks servem à demonstração e aos testes; os dados podem ser inspecionados e alterados pelo próprio navegador.

## Rotas e catálogo

Rotas públicas: `/`, `/nfts/$nftId`, `/cart` e `/login`. Cadastro é o modo `register` da rota de login, sem rota separada. Perfil, carteiras, checkout e `/orders/$orderId` usam `beforeLoad` com `requireSession`, preservando o destino para o login. Rotas desconhecidas exibem a página de não encontrado.

Busca, categoria, rede, faixa de preço, visualização, favoritos, ordenação e página ficam na URL: `q`, `category`, `network`, `minPrice`, `maxPrice`, `view`, `favorites`, `sort`, `page`. Ordenações: `recent`, `price-asc` e `price-desc`. Busca e filtros reiniciam a página. Os handlers filtram antes de ordenar/paginar as 24 fixtures, com nove resultados por página. `recent` usa `listedAt`; datas e popularidade são simuladas e determinísticas. Os limites de preço são inclusivos e comparados em wei. A edição limitada de cada terceiro NFT, começando pelo primeiro, inicia esgotada.

## Contratos REST

Todos os caminhos abaixo têm prefixo `/api`. Corpo e resposta usam JSON, exceto envio de avatar e respostas 204. Recursos privados usam `Authorization: Bearer <token>`. Sem esse header, o carrinho é do visitante; com token inválido, retorna 401. Os mocks dependem do navegador controlado pelo MSW, não atendem requisições externas como um servidor.

| Método e recurso | Entrada | Sucesso |
| --- | --- | --- |
| `POST /auth/register` | `{ name, email, password }` | 201 `Session` |
| `POST /auth/login` | `{ email, password }` | 200 `Session` |
| `GET /auth/session` | Token | `Session` |
| `POST /auth/logout`, `POST /auth/expire` | Token | 204; revoga o token informado |
| `GET /nfts` | Query `q, category, network, minPrice, maxPrice, view, favorites, sort, page` | `{ items: Nft[], total, page, pageSize }` |
| `GET /nfts/:id` | Identificador | `Nft` |
| `GET /nfts/:id/reviews` | Identificador | `{ items, average, total }`; avaliações de demonstração |
| `GET /favorites` | Token | `{ nftIds: string[] }` |
| `PUT /favorites/:id`, `DELETE /favorites/:id` | Token e NFT | Favoritos atualizados |
| `GET /cart` | Token opcional | `CartView` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | `CartView` |
| `PATCH /cart/items/:nftId/:editionId` | `{ quantity }` absoluta | `CartView` |
| `DELETE /cart/items/:nftId/:editionId` | Identificadores | `CartView` |
| `POST /cart/coupon` | `{ code }`; vazio remove | `CartView` |
| `POST /quotes` | `{ walletId }` | 201 `Quote` |
| `GET /quotes/:id` | Identificador | Cotação revalidada |
| `POST /orders` | `{ quoteId, collector: { name, email, notes } }`, header `Idempotency-Key` | 200 `Order`, novo ou recuperado |
| `GET /orders/:id` | Identificador | `Order` do usuário |
| `GET /profile` | Token | `Profile` |
| `PATCH /profile` | `{ name, email, displayName, ens, walletNickname }` | `Profile` atualizado |
| `POST /profile/password` | `{ currentPassword, newPassword, confirmation }` | 204 |
| `POST /profile/avatar` | `FormData`, campo `avatar` | `Profile` com avatar em data URL |
| `DELETE /profile/avatar` | Token | `Profile` sem avatar |
| `GET /wallets` | Token | `Wallet[]` |
| `PUT /wallets/:slot` | Dados da carteira; slot `primary` ou `secondary` | `Wallet` criada ou atualizada |
| `GET /wallet-connection` | Token | `WalletConnection` ou `null` |
| `POST /wallet-connection` | `{ walletId }` | Conexão simulada |
| `DELETE /wallet-connection` | Token | 204 |
| `PATCH /scenarios/nfts/:id/price` | `{ editionId, price }` | `Nft` atualizado; controle dos mocks, sem autenticação |
| `PATCH /scenarios/nfts/:id/availability` | `{ editionId, available }`, inteiro de 0 a 10000 | `Nft` atualizado |
| `PUT /scenarios/network` | `{ resource, delaysMs?, failures? }` | Configuração validada; reinicia sequência do recurso |
| `DELETE /scenarios/network` | Sem corpo | 204; remove todas as sequências de rede |
| `POST /scenarios/reset` | Sem corpo | `{ reload: '/' }`; exige navegação para concluir o reset |

Estruturas principais (tipos completos em `src/types` e `src/lib/wallet-schema.ts`):

- `Session`: `{ user: { id, name, email }, token, expiresAt }`.
- `Nft`: `{ id, name, image, price, category, network, editions, version }`. Edição: `{ id, name, price, available }`.
- `CartView`: `{ items, coupon?, lines, subtotal, discount, networkFee, total }`. Item: NFT, edição e quantidade. Linha acrescenta nome, imagem, disponibilidade, preço unitário e subtotal.
- `Quote`: `{ id, expiresAt, cart: CartView, wallet: Wallet }`.
- `Order`: `{ id, status, version, createdAt, updatedAt, transactionId, rejectionReason, collector, snapshot: Quote }`.
- `Profile`: `{ id, name, email, displayName, ens, walletNickname, avatar }`.
- `Wallet`: `{ id, slot, name, nickname, profileName, network, provider, address, email, ens, referralCode }`.
- `WalletConnection`: `{ id, walletId, expiresAt }`.

Preços e totais trafegam como strings decimais; quantidades são inteiros positivos seguros. Datas são timestamps em milissegundos. Erros usam `{ message }`, com `errors: Record<string, string[]>` em validações de conta/formulário e `code` em erros de pedido. Não há envelope único com todos os campos em todas as respostas.

Os handlers retornam 401 para sessão inválida, 404 para recurso ausente ou pedido/cotação de outra conta, 409 para conflitos e 422 para validação. Há 503 para falhas previstas e para o cenário de favorito. Não existe resposta 403 distinta para recursos de outra conta. Carteiras só são consultadas no escopo autenticado.

Perfil valida nome, nome de exibição e e-mail, e permite ENS vazio ou terminado em `.eth`. Avatar aceita PNG, JPEG e WebP de até 2 MB. Senha nova precisa ter de 8 a 128 caracteres, confirmar corretamente e diferir da atual. Carteiras aceitam Ethereum, Polygon e Solana; provedores MetaMask, WalletConnect e Coinbase Wallet. Endereços EVM usam `0x` e 40 caracteres hexadecimais; Solana usa o padrão de 32 a 44 caracteres base58. Duplicidade considera endereço e rede entre os dois espaços.

## Sessão e isolamento

Contas e sessões ficam em `kurio:auth-db:v1`; o token atual fica em `kurio:session-token`. Sessões duram uma hora. Senhas usam PBKDF2/SHA-256, salt individual e 100 mil iterações, sem persistência em claro. Trocar senha revoga outras sessões da conta e mantém a atual. Essa é uma simulação local, sem cookie HttpOnly nem autoridade de servidor real.

A consulta `['session']` usa `staleTime: 0`, sem retry, com verificação a cada 30 segundos enquanto observada. O Axios dispara `kurio:unauthorized` para respostas 401 autenticadas, exceto login/cadastro. O monitor confere o token que originou a falha antes de limpar a sessão e redirecionar páginas privadas, para uma resposta antiga não encerrar uma sessão nova. Mudança de token em outra aba provoca reload.

Aceitar sessão, sair ou expirar cancela consultas e remove caches de carrinho, perfil, carteiras, conexão, favoritos e pedidos. As chaves privadas incluem usuário. Os listeners de tempo real verificam o token atual e são desligados na desmontagem ou troca de sessão. Os dados persistidos dos mocks continuam separados por usuário e não são apagados no logout.

O rascunho de checkout (`name`, `email`, `notes`, `walletId`) fica no `sessionStorage` por usuário, permitindo retomada na mesma aba. A tentativa de pedido fica no `localStorage` por usuário e sobrevive ao refresh. Logout não equivale a reset desses dados.

## Carrinho, cotação e pedido

O visitante usa `kurio:guest-cart:v1`; contas usam `kurio:cart:user:<id>`. Login e cadastro mesclam linhas por NFT/edição, somam quantidades, preferem o cupom do visitante e removem o carrinho visitante. A mesclagem não limita novamente a soma ao estoque; a cotação rejeita disponibilidade insuficiente e o carrinho permite reduzir quantidades.

Os valores são calculados em wei com `BigInt` e convertidos para strings ETH. `KURIO10` desconta 10% do subtotal. O resumo do carrinho usa taxa `0.016`; a cotação aplica a rede da carteira: Ethereum `0.016`, Polygon `0.001`, Solana `0.0005`. O total válido para o pedido vem da cotação.

Cotações duram cinco minutos e guardam um fingerprint do carrinho calculado e da carteira. A validação recalcula disponibilidade, cupom e valores; alterações retornam 409 e exigem nova revisão. O checkout revalida antes do primeiro envio, e a criação do pedido valida novamente e exige conexão da carteira selecionada. A conexão simulada dura 15 minutos e pode ser recusada ou desconectada.

O pedido começa `pending`, com resolução prevista para três segundos depois. A transição acontece ao consultar o store por REST ou pelo loop do mock de socket. O resultado depende do cenário de pagamento e do estoque disponível. `confirmed` e `declined` são terminais. Confirmação cria referência `sim-...`, remove somente as quantidades compradas do carrinho e recompõe estoque pelos pedidos confirmados. Não há reserva de estoque enquanto pendente. Recusa mantém os itens.

O recibo lê o snapshot persistido no pedido. Mudanças posteriores no catálogo não recalculam seus valores. Referências de transação são simuladas.

O controle de disponibilidade guarda uma base ajustada em `kurio:catalog-availability:v1`: estoque atual informado mais quantidades já vendidas. `restoreInventory` usa essa base e desconta pedidos confirmados. Assim, um ajuste informa a disponibilidade efetiva, persiste no refresh e permite que novas vendas continuem consumindo estoque. A mudança passa por `syncCatalogState`, incrementando a versão e chegando à interface por `nft.updated` e reconsulta REST.

### Idempotência e recuperação

`src/lib/order-attempt.ts` salva uma chave UUID e o corpo antes de enviar. O checkout bloqueia envios concorrentes com uma ref e o estado da mutation. No mock, a chave deve ter de 8 a 128 caracteres e é vinculada ao usuário e ao conteúdo serializado da requisição. Repetir chave/corpo recupera o mesmo pedido; mudar o corpo retorna 409 `IDEMPOTENCY_CONFLICT`. Reutilizar uma cotação em outro pedido retorna `QUOTE_ALREADY_USED`.

Após timeout, a UI oferece recuperação da mesma tentativa. Se o ID é conhecido, consulta o pedido; caso contrário, reenvia chave e corpo originais. Apenas `ORDER_NOT_CREATED` permite descartar automaticamente uma tentativa não criada. Resultado incerto é preservado para impedir nova compra sem saber o desfecho. Ao observar estado terminal, a página remove a tentativa correspondente se o ID salvo coincide com o pedido.

## Cache, retries e atualização otimista

O QueryClient usa `staleTime` padrão de 30 segundos. Consultas fazem no máximo uma nova tentativa para falhas de rede ou servidor; HTTP 4xx não tem retry. Mutations não repetem automaticamente. A coleta de cache inativo mantém o padrão da biblioteca, sem persistir o QueryClient em disco. Refetch por foco/reconexão segue os padrões do TanStack Query, salvo opções específicas.

Catálogo usa `['nfts', search]`, detalhe `['nft', nftId]` e carrinho `['cart', userId ou 'guest']`. Os demais recursos privados incluem usuário e, quando necessário, recurso. Queries REST passam `AbortSignal` ao Axios para cancelamento. A consulta de pedido também compara a versão REST com a versão em cache antes de aceitar uma resposta mais antiga.

Adicionar ou editar carrinho invalida sua consulta. Salvar perfil atualiza seu cache e invalida sessão. Avatar e carteiras atualizam seus caches. Eventos invalidam recursos; a API continua sendo a referência para valores e estados.

Favoritos usam atualização otimista em `src/hooks/use-favorite.ts`: cancelam a consulta, salvam o estado anterior daquele NFT, atualizam o conjunto e fazem rollback somente desse item em caso de falha. A última mutation de favoritos em andamento invalida a consulta para reconciliar. Comparações de token impedem rollback de uma sessão anterior.

## Socket.IO e reconciliação REST

O cliente real `socket.io-client` usa a origem atual, path padrão `/socket.io/` e somente transporte WebSocket. Não há servidor Socket.IO remoto na demonstração. MSW intercepta WebSocket e `@mswjs/socket.io-binding` adapta o protocolo. O mock mantém loop de 500 ms, acompanha versões dos stores e envia heartbeat. Isso exercita o cliente e seus listeners, mas não simula infraestrutura distribuída, fallback de transporte para polling HTTP ou persistência entre dispositivos.

| Direção e evento | Payload | Efeito |
| --- | --- | --- |
| Cliente → `catalog.subscribe` | Sem payload | Assinar catálogo público |
| Mock → `catalog.ready` | `{}` | Reconciliar catálogo, detalhe e carrinho por REST, inclusive após reconectar |
| Mock → `nft.updated` | `{ id, resourceId, version }` | Invalidar catálogo, detalhe e carrinho, informar alteração e invalidar revisão do checkout |
| Cliente → `session.subscribe` | `{ token }` | Autenticar acompanhamento privado |
| Mock → `session.ready` | `{ userId }` | Reconsultar pedido e emitir assinatura |
| Cliente → `order.subscribe` | `{ orderId }` | Assinar pedido da sessão |
| Mock → `order.updated` | `{ id, resourceId, version, userId }` | Reconsultar pedido, carrinho, catálogo e detalhe |
| Mock → `session.expired` | `{}` | Invalidar sessão e encerrar acompanhamento privado |
| Mock → `realtime.error` | `{ message }` | Informar falha de acompanhamento |

Eventos são notificações, sem cópia completa dos dados. O cliente valida o payload e descarta versões repetidas ou antigas por recurso. O pedido compara também com a versão REST em cache e confere usuário, recurso e token. A deduplicação usa versão, sem registro persistido dos IDs de evento. O catálogo mantém versões conhecidas durante o ciclo do efeito; após remontagem, a reconciliação REST recupera os dados atuais.

Na reconexão, assinaturas são refeitas e os eventos `ready` provocam invalidação REST. O pedido tem ainda polling REST a cada 15 segundos enquanto `pending`. O cliente não aplica confirmação diretamente pelo evento. Listeners, sockets e timers do mock são liberados no encerramento do ciclo. Os stores locais não oferecem sincronização entre dispositivos; múltiplas abas não equivalem a um backend concorrente.

## Controles de rede e reset

`src/mocks/network-scenarios.ts` aplica sequências somente às consultas de catálogo, detalhe e carrinho. Não há caminhos alternativos no Axios, nos componentes ou no cache. `PUT /scenarios/network` aceita `resource: 'catalog' | 'detail' | 'cart'`, `delaysMs` com 1 a 50 inteiros entre 0 e 8000 e `failures` com até 50 valores `network`, `http-503` ou `null`. Os campos de sequência são opcionais; um PUT substitui a configuração e zera o cursor daquele recurso.

O MSW consome cada passo antes do await, por ordem de chegada, e persiste o cursor em `kurio:scenario:network`. O último atraso se repete; falhas não se repetem depois do fim da lista. Consultas canceladas também consomem um passo. `HttpResponse.error()` produz erro de conexão e a alternativa HTTP retorna 503. Retries da aplicação passam pelo mesmo controle. `DELETE /scenarios/network` remove as sequências sem mudar os dados de negócio. Os atrasos originais permanecem quando não há configuração.

O reset é explícito, sem botão novo na interface: `POST /scenarios/reset`, seguido da navegação para o `reload` retornado. `src/mocks/reset.ts` limpa apenas o namespace `kurio:` dos dois storages e mantém um marcador temporário no `sessionStorage`. A recarga é obrigatória: `src/main.tsx` consome o marcador e repete a limpeza antes de importar/inicializar os stores, sem deixar escritas tardias da página anterior no cenário novo. Depois, `seedAuth` recria as duas contas com as credenciais iniciais e `restoreInventory` parte das fixtures originais.

Essa recarga também recria o QueryClient e os módulos, descartando catálogo em memória, requests, timers e conexões Socket.IO anteriores. O worker não é desinstalado. O reset elimina todos os usuários alterados ou adicionais, sessões, dados privados, carrinhos, cotações, pedidos, tentativas, drafts e controles de cenário dessa origem/aba. IDs e salts são novos, mas o estado funcional é o mesmo após resets repetidos. Outras abas devem ser fechadas: seus `sessionStorage` e escritas independentes não são controlados por esta operação.

`e2e/mock-reset.spec.ts` verifica restauração após alterações nas duas contas, venda confirmada, reposição e esgotamento, avatar, dados privados e escritos tardios, além de preservar dados externos ao namespace. `e2e/mock-scenarios.spec.ts` verifica skeletons, erros de conexão/503 e recuperação, ordenação das respostas e cancelamento da busca anterior, e esgotamento no checkout. A retomada de pedido pendente em `e2e/realtime.spec.ts` usa o relógio fixo do Playwright e o controle de interrupção existente no mock, mantendo as mensagens no transporte Socket.IO e a reconciliação na API REST.

## Acessibilidade e limites desta revisão

Os inputs de perfil usam `aria-labelledby` no span com apenas o título e `aria-describedby` no span de erro. O asterisco é `aria-hidden`, e `required` indica obrigatoriedade. Assim, a validação não muda o nome acessível. Esses vínculos foram preservados na revisão visual.

Há feedback com `role="status"` e `role="alert"`, estados de carregamento e shimmer com respeito a movimento reduzido. Isso não constitui auditoria completa de acessibilidade. O HTML declara `lang="pt-BR"`, título Kurio e descrição em português. A tipografia usa Consolas com fallback Liberation Mono, Courier New e monospace; Geist continua empacotada. É uma aproximação: `font/family` é um token sem família identificada, não um nome de fonte.

## Composição de home e detalhe

`src/marketplace.css` concentra a composição dessas duas páginas. `MarketplaceHeader`, `MarketplaceFooter` e `MobileNavigation` são usados apenas nesse escopo; o header anterior e a composição de conta, carrinho e checkout foram preservados. Cores e pilha tipográfica são compartilhadas em `src/index.css`. Os PNGs de início e detalhe, desktop/mobile, foram inspecionados antes dos ajustes e comparados com screenshots do navegador. Nenhum asset foi substituído.

A busca saiu do corpo do catálogo para o header: o formulário navega pelo Router, preserva filtros e reinicia a página. No desktop, o ícone abre a busca; no mobile ela já fica visível. Os filtros de coleção/rede permanecem no formulário associado à ordenação. Em mobile, o botão de filtros expande a lateral no fluxo e move o foco para a coleção, sem criar um modal sem controle de foco. Pills de edição são rádios nativos com nomes acessíveis estáveis; quantidade continua validada pelo mesmo estado, e os botões de incremento respeitam o estoque. As mutations de favoritos e carrinho permanecem nos hooks anteriores.

`NftGallery` mantém apenas a seleção visual do recorte. Todos os recortes usam a imagem original fornecida e são identificados como vistas da mesma obra. A ampliação usa `dialog` nativo para foco, Escape e retorno ao acionador. As miniaturas aparecem ao lado da imagem no desktop e dentro do diálogo no mobile; a escolha atualiza a visualização e persiste ao fechar. O diálogo informa a ausência de fotografias alternativas nos assets. Relacionados são consultados por Query/Axios com a categoria atual e exibidos em carrossel de 2/3/5 cards por página, com scroll, pontinhos, teclado e resize. Avaliações vêm do endpoint MSW de reviews: selo, resumo e aba compartilham o cache; média e total são derivados dos comentários fictícios. O NFT principal tem 19 avaliações e média 4,8. Não há publicação de comentários nem propriedade blockchain real.

As abas de informações usam foco gerenciado e navegação por setas, Home e End. O CTA inclui “Comprar NFT” no nome acessível e explicita a adição ao carrinho; “Favoritar” mantém o nome da variante textual e comunica o estado com `aria-pressed`.

As seções editoriais e a newsletter reproduzem a hierarquia visual sem fingir serviços de publicação ou inscrição. Links de perfil, carteiras, catálogo e cards usam rotas reais; destinos editoriais não implementados não são links de sucesso. Os três destaques do hero alternam automaticamente entre assets existentes e apontam para filtros reais. Pontinhos mantêm troca manual; pausa/retomada aparece somente ao foco de teclado, sem ocupar uma linha. Movimento reduzido desativa o autoavanço.

O script `scripts/visual-review.mjs` captura home e detalhe em 390, 768 e 1440 px por padrão. `VISUAL_REVIEW_WIDTHS` permite incluir 414 px, a largura das referências mobile; `VISUAL_REVIEW_OUTPUT` separa revisões. O JSON registra medidas dos blocos, carregamento de cada imagem e largura do documento. `scripts/compare-visual.ps1` monta pares de referência/implementação na mesma escala, com recortes separados por seção. A fidelidade é avaliada pela inspeção desses pares, separadamente no desktop e mobile. Carregamento e ausência de overflow não demonstram fidelidade. Não há `overflow-x: hidden` no documento para mascarar cortes. O recorte da galeria é local à imagem; textos auxiliares para leitores de tela usam a técnica `sr-only`, incluindo a disponibilidade associada ao input de quantidade. Os artefatos são de revisão e não baselines de regressão.

Limitações visuais documentadas no README: fonte aproximada, categorias e edições das fixtures e dados diferentes dos exemplos do Figma. Datas e popularidade são simuladas; a API aceita intervalo de preços inclusivo em wei. Não há integrações blockchain reais.

### Apresentação da compra

`CommerceLayout` reutiliza `MarketplaceHeader` e `MarketplaceFooter` nas rotas de carrinho, checkout e pedido, com breadcrumb desktop e retorno/título mobile. Os estilos novos ficam em `commerce.css`; os seletores não reorganizam home, detalhe ou conta. `PurchaseLines` e `CartTotals` recebem `CartView`/linhas prontas da API e não calculam preços no componente. `CartSuggestions` consulta o catálogo por Query/Axios e exclui os IDs do carrinho; não afirma possuir histórico de visualizações de outros usuários.

O checkout consulta perfil, carteiras, conexão e carrinho nos endpoints existentes. `readDraft` dá prioridade aos valores já salvos; na ausência deles, usa `Profile.displayName`/`email`, com os dados da sessão como fallback explícito em erro de perfil. O usuário é avisado desse erro e pode refazer a consulta. Rede, endereço, apelido, nome do perfil, provedor, indicação e ENS são exibidos em inputs somente de leitura da carteira selecionada. O outro endereço cadastrado é informativo e identificado como “Outra carteira”. Nenhum desses campos foi adicionado ao coletor do pedido: a carteira completa já integra a cotação e seu snapshot.

`useMobile` observa apenas o breakpoint de apresentação de 767 px via `matchMedia`/`useSyncExternalStore`. Isso permite usar a ordem correta de elementos no DOM em cada composição, sem valores positivos de `tabindex`. A lógica de draft, conexão, revisão e tentativa fica no mesmo `CheckoutForm`, fora dessa escolha de apresentação. Na validação nativa, um campo inválido reabre o grupo mobile e recebe foco. O botão de confirmação continua condicionado à cotação atual, e mudanças do draft/conexão/eventos invalidam a revisão como antes.

O recibo exibe `collector` e `snapshot` do próprio pedido nos três estados. Apenas a confirmação exibe o ID de transação; pendência e recusa não afirmam transferência de ativos. As consultas, controle de versões, limpeza da tentativa terminal, polling e reconciliação Socket.IO/REST foram preservados. Nenhuma regra de estoque, taxa, idempotência ou recuperação foi alterada.

O [README](README.md) registra controles dos cenários, reset, comandos, credenciais e a URL pública informada, [kurio-nft-pied.vercel.app](https://kurio-nft-pied.vercel.app/). Não houve novo deploy nem validação desse domínio nesta etapa. As credenciais iniciais conferidas no seed são `demo@kurio.test` e `outro@kurio.test`, ambas com `Kurio123!`; mocks requerem `VITE_ENABLE_MOCKS=true` no build.

Há configuração reproduzível em `scripts/lighthouse.config.mjs` e execução em `scripts/lighthouse.mjs`. As medianas finais foram: Home mobile 83/100/100/92, detalhe mobile 87/100/100/92 e ambas desktop 99/100/100/92, na ordem Performance/Accessibility/Best Practices/SEO. **Performance mobile permanece abaixo da meta 90.** [Resumo e métricas](artifacts/lighthouse/2026-10-24T20-18-35.247Z/summary.md), [JSON](artifacts/lighthouse/2026-10-24T20-18-35.247Z/summary.json) e [anexo com os 12 pares HTML/JSON e configuração](artifacts/kurio-lighthouse-final.zip) usam caminhos relativos. Os arquivos existem no working tree/anexo; ainda precisam ser incluídos na entrega remota, pois não houve commit/push. O snapshot auditado é anterior à correção atual do header e não foi reauditado.

Não foram encontrados baselines automatizados em `e2e/` nem asserções `toHaveScreenshot`/`toMatchSnapshot` na suíte. As pastas `artifacts/visual-review/current`, `comparison-after`, `commerce-current` e correlatas contêm revisão manual, ignorada pelo Git, não baselines automatizadas. Testes funcionais continuam existentes. A conferência atual foi restrita ao header; não executou Lighthouse nem suíte completa. A recusa de testes na tentativa anterior está no histórico; a conferência atual foi autorizada e executada.

## Ajustes de navegação e descoberta

O header usa navegação do Router e rolagem explícita para aceitar cliques repetidos
na mesma seção. O destaque visual/acessível acompanha a posição das seções; o
listener de scroll é passivo, agrupa medições com requestAnimationFrame e é removido
no unmount. A navegação entre seções preserva os filtros da home.

O layout desktop de 1440 px permanece. Abaixo de 1200 px, os links desktop são substituídos pelo acionador compacto do `MobileNavigation` existente, sem recortar os últimos itens. O mesmo diálogo nativo oferece Início, Mercado, Criadores, Aprenda, carrinho e conta; Escape e retorno de foco são nativos. Busca e ações existentes permanecem. A implementação acrescenta classes Tailwind nos dois componentes, sem dependências ou alteração de CSS global. Foram conferidos visualmente 390/768/1024/1440 px e a transição 1199/1200 px, além de teclado, busca, conta/carrinho e overflow; não se trata de auditoria geral das páginas.

O contrato da listagem acrescenta `view` (all/new/trending) e `favorites=true`.
A API calcula a janela de novos lançamentos a partir da data máxima das fixtures,
sem depender da data de execução. Popularidade é fictícia e determinística.
Filtros são aplicados antes da ordenação/paginação. Favoritos exigem sessão válida;
chaves de cache incluem a identidade do usuário e são limpas com as demais consultas
privadas. A rota de login aceita apenas o destino exato adicional
`/?favorites=true#catalogo`, mantendo a restrição de redirecionamentos internos.

Coleção/rede passaram de listboxes nativos para grupos de rádios; os testes de
comportamento foram adaptados aos novos controles, mantendo verificação de URL,
resultados, paginação e histórico. A ordenação usa o Select existente do shadcn,
sem adicionar dependências. Os recortes da galeria e os fluxos de compra permanecem
inalterados.
