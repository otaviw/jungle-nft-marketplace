# Carrinho, checkout e recibo

## Referências e escopo

Foram abertos os frames `Carrinho de NFTs.png` e `Pagamento.png` em `pages figma/Desktop` (1440 px) e `pages figma/Mobile` (414 px), antes das alterações. Não existe um frame de recibo nessa pasta. O recibo foi adaptado com a mesma identidade e os componentes de resumo da compra; não é apresentado como reprodução de um frame ausente.

Home e detalhe mantêm suas composições. Não houve mudança de fixtures, assets, dependências, regras de compra ou contratos REST. O único ajuste funcional compartilhado foi permitir o clique no botão “Fechar aviso” do aviso de preço/estoque; o contêiner continua deixando o restante dos cliques passar.

## Composição e dados

- Carrinho desktop: linhas compactas com imagem, nome, ID, edição, preço unitário, quantidade, subtotal e remoção; resumo lateral e cupom. As sugestões usam o catálogo real e excluem IDs do carrinho, sem afirmar histórico de visualizações de outros usuários.
- Carrinho mobile: cards de 100 px de altura, controles por linha e resumo abaixo, com cupom e ação principal. A edição continua identificada também no desktop quando há duas edições da mesma obra.
- Checkout desktop: campos em duas colunas, seleção compacta de carteira junto ao perfil, resumo e provedor à direita. No mobile, carteiras e provedores vêm antes do resumo, e o perfil é recolhível. O DOM acompanha a ordem de cada composição, sem `tabindex` positivo.
- Recibo: estado, dados do pedido/coletor/carteira e resumo do snapshot. Pendência, recusa e erro não exibem uma confirmação de transferência. Consulta e reconexão recuperam o mesmo pedido.

Nome e e-mail iniciais vêm do perfil. O draft salvo tem prioridade. Apelido, rede, nome do perfil, endereço, provedor, indicação e ENS vêm da carteira selecionada; os campos são somente de leitura e apontam para a edição do cadastro. “Outra carteira” mostra o outro cadastro, quando existe. Não há formulário decorativo com dados descartados.

Os contratos existentes já contêm os dados necessários: `collector` recebe nome/e-mail/notas, e `Quote.wallet` contém a carteira completa. O pedido preserva a cotação em `snapshot`. O teste novo altera o cadastro depois da compra e confirma que o recibo mantém o snapshot anterior.

## Inspeção visual

As capturas são reais, feitas pelo Chromium com MSW ativo. O setup usa endpoints de cadastro e carrinho com o usuário fictício, sem editar as fixtures. Há quatro itens nas capturas mobile e três nas de desktop para comparar a composição com a quantidade de linhas dos frames; os valores e nomes continuam sendo os das fixtures.

| Tela | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| Carrinho | [Captura](../artifacts/visual-review/commerce-current/cart-390.png) | [Captura](../artifacts/visual-review/commerce-current/cart-768.png) | [Captura](../artifacts/visual-review/commerce-current/cart-1440.png) |
| Checkout | [Captura](../artifacts/visual-review/commerce-current/checkout-390.png) | [Captura](../artifacts/visual-review/commerce-current/checkout-768.png) | [Captura](../artifacts/visual-review/commerce-current/checkout-1440.png) |
| Recibo | [Captura](../artifacts/visual-review/commerce-current/receipt-390.png) | [Captura](../artifacts/visual-review/commerce-current/receipt-768.png) | [Captura](../artifacts/visual-review/commerce-current/receipt-1440.png) |

Comparação na mesma escala, referência à esquerda:

- [Carrinho desktop](../artifacts/visual-review/commerce-comparison/cart-desktop.png) e [mobile em 414 px](../artifacts/visual-review/commerce-comparison/cart-mobile.png).
- [Checkout desktop](../artifacts/visual-review/commerce-comparison/checkout-desktop.png) e [mobile em 414 px](../artifacts/visual-review/commerce-comparison/checkout-mobile.png).

Foram ajustados após a primeira inspeção o alinhamento do título mobile do carrinho, a altura da linha de cabeçalho desktop, o espaçamento do resumo e a posição dos cartões de carteira desktop, que alongavam excessivamente a coluna lateral. A barra de ações deixou de mudar de posição quando um campo perde foco; essa troca fazia o primeiro clique de revisão não chegar ao botão. Em altura de até 500 px, a barra volta ao fluxo normal e mantém a ordem de teclado.

Também há capturas de carrinho vazio, skeleton, erro 503 e recuperação, checkout vazio, perfil aberto, cotação revisada e recibo pendente/recusado/não encontrado em `commerce-current`. As falhas e latências vêm dos controles reais do MSW, não de estados injetados nos componentes.

## Arrasto horizontal, foco e zoom

A investigação registra largura do documento, largura útil (`clientWidth`), retângulos dos elementos e `scrollX`, incluindo filtros, conta, galeria/recorte, login/cadastro e grupos do checkout abertos. O gesto de toque horizontal e uma tentativa explícita de scroll horizontal verificam se o documento realmente se desloca. Os resultados ficam em `horizontal-opera/checks.json` e `horizontal-chromium/checks.json`.

A auditoria final no Opera GX concluiu 41 verificações em 390, 414 e 768 px, incluindo os estados abertos descritos acima. A largura útil coincidiu com a largura do documento, nenhum retângulo não recortado ultrapassou o limite e `scrollX` permaneceu em zero mesmo após os gestos/tentativas de deslocamento. O navegador usou um perfil temporário isolado; os resultados também registram URL e dimensões do viewport visual.

O arrasto relatado no modo responsivo do Opera não foi reproduzido nessa configuração. Não foi identificado um elemento causador. Na conferência manual seguinte, o usuário relatou que precisava dar F5 e considerou a situação tranquila; isso não foi tratado como prova de uma causa de cache ou de uma correção no código. Não foi acrescentado `overflow-x: hidden/clip` em `html` ou `body` para esconder o sintoma. As medições iniciais somente por `innerWidth` foram ampliadas para usar também `clientWidth`, evitando ignorar diferenças causadas pela barra de rolagem.

O teste de checkout confere a ordem inicial de Tab no mobile e o foco de e-mail inválido, inclusive quando o grupo está recolhido. A revisão estática também verificou a ordem em telas baixas. A conferência de reflow a 200% usou viewport lógico de 720×448 e escala 2, equivalente à área útil de um desktop de 1440×896 nessa ampliação. As seis capturas foram inspecionadas, incluindo o [checkout revisado inteiro](../artifacts/visual-review/commerce-zoom-200/checkout-reviewed-720-full.png), com as ações no fluxo após o perfil. É uma emulação de reflow, não uma afirmação sobre a interface de zoom do Opera do usuário. Não houve validação de teclado virtual em um aparelho físico.

## Diferenças restantes

- A fonte original não foi identificada; permanece a aproximação consistente usada no marketplace.
- Nomes, IDs, edições, quantidades e preços vêm das fixtures. A identificação da edição e o controle de remoção ficam visíveis em todas as linhas, mesmo onde o frame não os mostra.
- A seleção representa carteiras cadastradas e conexão simulada. Provedores sem cadastro ficam desativados com explicação, em vez de simularem uma conexão.
- Revisar e confirmar continuam separados; o frame ilustra apenas uma ação. Essa diferença mantém a revisão dos valores, a cotação e a recuperação da compra.
- Campos de carteira usam os dados cadastrados e são somente de leitura; não foram criados selects ou campos obrigatórios sem função.
- O perfil e os detalhes do resumo continuam acessíveis no mobile, embora o frame priorize somente carteira e total. Não há menus de reticências nem carrossel de sugestões sem comportamento implementado.
- Os quatro assets reais são reutilizados pelas fixtures existentes. Não foram inventadas novas imagens ou vistas.
- O recibo e a adaptação de 768 px não têm frames próprios fornecidos.
- O checkout desktop é mais alto que o frame porque mantém conexão, revisão e avisos do fluxo existente. Permanecem diferenças pontuais de métricas da fonte e espaçamento no resumo do carrinho.

## Arquivos

- `src/pages/cart.tsx`, `src/pages/checkout.tsx`, `src/pages/order.tsx`.
- `src/components/layout/commerce-layout.tsx`, `src/components/layout/catalog-realtime.tsx`.
- `src/components/checkout/purchase-summary.tsx`, `cart-suggestions.tsx`, `quote-summary.tsx`.
- `src/hooks/use-mobile.ts`, `src/commerce.css`, `src/index.css`.
- `e2e/checkout-data.spec.ts`, `e2e/consistency.spec.ts`, `e2e/account-cart.spec.ts`.
- `scripts/commerce-review.mjs`, `scripts/compare-commerce.ps1`, `scripts/audit-horizontal.mjs`.
- `README.md`, `ARCHITECTURE.md`, este relatório e `docs/superpowers/plans/2026-10-24-commerce-visual.md`.

## Validação

O teste novo primeiro falhou ao comparar o nome da sessão com o nome de exibição do perfil. Após a implementação, passou em desktop e mobile. O teste de fechar o aviso fixo também reproduziu a falha real de clique antes da correção. Não foram removidas assertions nem aumentados timeouts.

Lint e build final com `VITE_ENABLE_MOCKS=true` aprovados. O build mantém o aviso de chunk acima de 500 kB (615,18 kB). As capturas finais foram feitas no preview desse build, inspecionadas nas quatro larguras e comparadas com os frames na mesma escala. O relatório `state-checks.json` preserva as 34 verificações da rodada com estados alternativos; `checks.json` contém as 22 verificações das capturas principais finais. A rodada de zoom tem seis verificações, e cada auditoria horizontal tem 41.

Testes afetados, executados sequencialmente com um worker:

```sh
npm run test:e2e -- e2e/account-cart.spec.ts e2e/checkout-data.spec.ts e2e/checkout-validation.spec.ts e2e/consistency.spec.ts e2e/mock-scenarios.spec.ts e2e/purchase.spec.ts e2e/purchase-failures.spec.ts e2e/quote-expiration.spec.ts e2e/realtime.spec.ts
```

| Rodada | Resultado |
| --- | --- |
| Seleção de nove arquivos, desktop e mobile | 38 aprovados e 2 falhas mobile, em 7,5 minutos |
| Reexecução de `account-cart.spec.ts` e `checkout-data.spec.ts`, somente mobile | 3 aprovados em 42,6 segundos |

As duas falhas eram de interação do teste com a composição nova: logout ainda procurava “Sair” no carrinho mobile, e o teste de Tab começava antes de o formulário carregar. O logout agora passa pelo retorno ao catálogo e diálogo real de conta, aguarda a saída e volta ao carrinho; o teste de foco aguarda “Gerenciar carteiras” ficar visível. As assertions de sessão, carrinho, foco, draft, validação e snapshot foram preservadas. Os dois casos que falharam passaram na reexecução; os outros 38 já tinham passado na seleção inicial.

```sh
npm run test:e2e -- e2e/account-cart.spec.ts e2e/checkout-data.spec.ts --project=mobile
```

Não houve execução concorrente de Playwright nem execução da suíte inteira nesta rodada. Nenhum commit ou push foi feito.
