# Arquitetura

## Organização

A aplicação é uma SPA React com TypeScript e Vite. Telas ficam em `src/pages`, componentes em `src/components` e os componentes de UI em `src/components/ui`, com Tailwind e shadcn/ui. `src/router.tsx` declara as rotas com TanStack Router. TanStack Query mantém estado remoto; as chamadas REST passam pelo Axios de `src/lib/api.ts`, com base `/api` e timeout de 10 segundos.

`src/types` define contratos de transporte. Zod valida formulários, parâmetros e eventos em pontos específicos; nem toda resposta Axios tem validação de runtime. Handlers e stores em `src/mocks` simulam a API e persistem os dados no navegador. O bootstrap só importa e inicia essa camada quando `VITE_ENABLE_MOCKS === 'true'`, inclusive no build de demonstração. As páginas não retornam fixtures como alternativa à API.

Não há servidor de produção neste repositório. Persistência e autorização dos mocks servem à demonstração e aos testes; os dados podem ser inspecionados e alterados pelo próprio navegador.

## Rotas e catálogo

Rotas públicas: `/`, `/nfts/$nftId`, `/cart` e `/login`. Cadastro é o modo `register` da rota de login, sem rota separada. Perfil, carteiras, checkout e `/orders/$orderId` usam `beforeLoad` com `requireSession`, preservando o destino para o login. Rotas desconhecidas exibem a página de não encontrado.

Busca, categoria, rede, ordenação e página ficam na URL: `q`, `category`, `network`, `sort`, `page`. Ordenações: `recent`, `price-asc` e `price-desc`. Busca e filtros reiniciam a página. Os handlers aplicam os mesmos parâmetros às 24 fixtures, com nove resultados por página. `recent` mantém a ordem das fixtures, sem campo de data. A edição limitada de cada terceiro NFT, começando pelo primeiro, inicia esgotada.

## Contratos REST

Todos os caminhos abaixo têm prefixo `/api`. Corpo e resposta usam JSON, exceto envio de avatar e respostas 204. Recursos privados usam `Authorization: Bearer <token>`. Sem esse header, o carrinho é do visitante; com token inválido, retorna 401. Os mocks dependem do navegador controlado pelo MSW, não atendem requisições externas como um servidor.

| Método e recurso | Entrada | Sucesso |
| --- | --- | --- |
| `POST /auth/register` | `{ name, email, password }` | 201 `Session` |
| `POST /auth/login` | `{ email, password }` | 200 `Session` |
| `GET /auth/session` | Token | `Session` |
| `POST /auth/logout`, `POST /auth/expire` | Token | 204; revoga o token informado |
| `GET /nfts` | Query `q, category, network, sort, page` | `{ items: Nft[], total, page, pageSize }` |
| `GET /nfts/:id` | Identificador | `Nft` |
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

## Acessibilidade e limites desta revisão

Os inputs de perfil usam `aria-labelledby` no span com apenas o título e `aria-describedby` no span de erro. O asterisco é `aria-hidden`, e `required` indica obrigatoriedade. Assim, a validação não muda o nome acessível. Esta revisão não altera classes, espaçamentos ou composição das telas.

Há feedback com `role="status"` e `role="alert"`, estados de carregamento e shimmer com respeito a movimento reduzido. Isso não constitui auditoria completa de acessibilidade. O HTML ainda declara `lang="en"` apesar da interface em português; conferir em revisão de acessibilidade/SEO. A tipografia combina Geist importada e Courier New no body. Fidelidade ao Figma e assets corretos ainda precisam ser conferidos; nenhuma substituição foi introduzida nesta tarefa.

O [README](README.md) registra os controles reais dos cenários, reset manual, quatro imagens ausentes e pendências de deploy, Lighthouse, screenshots e cobertura. Não há reset integral implementado na interface/API, configuração de auditoria Lighthouse ou baselines visuais. A configuração Vercel está preparada; a execução em hospedagem pública permanece pendente.
