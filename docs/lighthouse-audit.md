# Auditorias Lighthouse — 24/10/2026

## Primeira rodada, antes das correções

Foram concluídas 12 auditorias válidas no build de produção com `VITE_ENABLE_MOCKS=true`, cenário padrão, entre 16:33 e 16:36 (America/Sao_Paulo). A execução foi sequencial, sem iniciar Playwright. As alterações locais foram mantidas; nenhum componente, mock ou CSS foi editado nesta tarefa. A única alteração de produto foi a autorizada em `index.html`: idioma pt-BR, título Kurio e descrição em português.

## Resultados

Medianas independentes das três medições de cada combinação. LCP e TBT em milissegundos; CLS sem unidade.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Mobile | 79 | 93 | 100 | 92 | 3655,2 | 0,0000 | 282,0 |
| Emerald Ape #001 | Mobile | 63 | 92 | 100 | 92 | 3344,5 | 0,9885 | 78,0 |
| Home | Desktop | 99 | 92 | 100 | 92 | 779,2 | 0,0007 | 7,5 |
| Emerald Ape #001 | Desktop | 99 | 97 | 100 | 92 | 725,7 | 0,0577 | 0,0 |

Performance não alcançou 90 no mobile das duas páginas. Accessibility não alcançou 95 na Home em ambos os perfis e no detalhe mobile. Todas as combinações alcançaram as metas de Best Practices (95) e SEO (90). Não houve warnings de execução nos 12 relatórios.

## Relatórios e reprodução

- [Resumo gerado automaticamente](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/summary.md) e [resumo JSON](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/summary.json).
- [Diretório dos 12 pares HTML/JSON e validações](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/).
- Exemplos HTML: [Home mobile](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/home-mobile-1.html), [detalhe mobile](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/nft-001-mobile-1.html), [Home desktop](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/home-desktop-1.html), [detalhe desktop](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/nft-001-desktop-1.html).
- [Verificação independente dos arquivos](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/verification.json): 12 HTML, 12 JSON, 12 validações, 138 ocorrências de imagens decodificadas, fonte Consolas renderizada, respostas de APIs durante a medição confirmadas, medianas recalculadas e hashes de `dist` conferidos.

```sh
npm ci
npm run audit:lighthouse
node scripts/verify-lighthouse.mjs artifacts/lighthouse/<execução> --check-build
```

O último comando verifica os arquivos sem executar outra auditoria. Omitir `--check-build` permite conferir relatórios históricos depois que `dist` tiver sido reconstruído.

## Ambiente e condições

Node 22.19.0; npm 11.10.1; Lighthouse 13.5.0; Puppeteer Core 25.16.0; Chrome Launcher 1.2.2; Vite 8.3.5; Chrome headless 155.0.0.0; axe-core 4.14.0. Windows x64, release 10.0.26200, Intel Core i5-11300H @3.10 GHz, oito CPUs lógicas, aproximadamente 15,79 GiB de RAM. Versões e condições completas em [environment.json](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/environment.json) e [runs.json](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/runs.json).

Preview Vite em `http://127.0.0.1:4175`, build único, porta estrita; perfil Chrome temporário novo por medição, sem extensões ou estado de usuário reaproveitado. Perfis padrão do Lighthouse, throttling simulado:

| Perfil | Viewport CSS | DPR | RTT | Throughput | Multiplicador CPU |
| --- | --- | ---: | ---: | ---: | ---: |
| Mobile | 412 × 823 | 1,75 | 150 ms | 1638,4 Kbps | 4 |
| Desktop | 1350 × 940 | 1 | 40 ms | 10240 Kbps | 1 |

As latências originais de MSW, bootstrap assíncrono, eventos e animações permaneceram ativos. Não foram ocultados elementos nem removidas funcionalidades. Esta é uma medição de laboratório na máquina de desenvolvimento compartilhada com o IDE, sem garantia de isolamento de carga de CPU; não representa aparelho físico nem valida o deploy público. Os viewports acima são os presets Lighthouse, separados da matriz de responsividade do challenge.

O build auditado, incluindo o trabalho local existente naquele momento, está identificado pelos hashes de [build-sha256.json](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/build-sha256.json). Alterações posteriores no carrossel ou outros arquivos exigem nova execução para uma nova baseline; estes resultados descrevem esse snapshot. O código de auditoria também verifica que `dist` não mudou durante a execução.

## Validade do carregamento

Cada relatório foi acompanhado de validação do DOM, decodificação das imagens visíveis após rolagem, confirmação do worker MSW ativo e ausência de erros de interface ou chaves de cenário customizado. Foram confirmados catálogo real com 24 NFTs (nove cards por página na Home), detalhe `nft-001` com nome Emerald Ape #001 e relacionados no detalhe. As respostas HTTP 200 das consultas de catálogo/detalhe foram verificadas no log de rede da própria navegação medida, não apenas em chamadas posteriores.

As imagens da galeria, catálogo e destaques carregaram com dimensões naturais maiores que zero. A rolagem para imagens lazy e as consultas extras de validação ocorreram após a medição. Não houve falhas HTTP nos documentos, scripts, estilos, imagens ou fontes necessários. O CSS efetivamente aplica Consolas e alternativas monospace: o CDP comprovou glyphs renderizados em Consolas. Geist está importada, mas não aplicada; a ausência de download WOFF corresponde a essa configuração, não a uma fonte quebrada. Não houve alteração para forçar downloads ou trocar tipografia.

## Causas e correções prioritárias

### 1. Geometria do carregamento do detalhe mobile (Performance 63)

O CLS é 0,9885 nas três medições. Em `nft-001-mobile-1.json`, `layout-shifts`/`cls-culprits-insight` atribuem 0,988324 ao `body`; um segundo deslocamento de aproximadamente 0,000162 atinge `.detail-tabs`. O filmstrip mostra dois blocos do skeleton em 750 ms sendo substituídos pela galeria e informações em 1125 ms: [antes](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/diagnostic-frame-750.jpg) e [depois](../artifacts/lighthouse/2026-10-24T19-33-09.362Z/diagnostic-frame-1125.jpg).

O código usa um skeleton quadrado mais um bloco `h-64`, enquanto o conteúdo inclui topbar, galeria, painel de compra, abas, resumo de avaliações e relacionados; esses espaços não mantêm a mesma geometria no carregamento. Prioridade: preservar dimensões e posições do conteúdo mobile durante a substituição dos estados assíncronos e reservar o espaço do resumo de avaliações. O relatório agregado identifica o `body` como nó afetado; a contribuição exata de cada mutação descendente exige trace adicional, portanto não se atribui todo o valor a um único componente sem essa evidência. Nenhuma correção foi aplicada.

### 2. Caminho crítico de JavaScript e descoberta do LCP (Performance mobile 79/63)

O build registra chunk principal de 747,86 kB minificado (238,87 kB gzip) e aviso acima de 500 kB. `unused-javascript` estima cerca de 120 KiB sem uso na Home e 129,8 KiB no detalhe. A Home mobile tem TBT mediano de 282 ms e LCP de 3655 ms. O HTML inicial entrega apenas `#root`; `main.tsx` aguarda imports de mocks, seed de autenticação, restauração de inventário e inicialização do worker antes de montar React. A cadeia de rede do relatório termina na consulta REST antes de renderizar os cards; o servidor HTML local responde em poucos milissegundos.

Na Home mobile, `lcp-discovery-insight` identifica como LCP uma imagem de card `Emerald Ape #001` com `loading="lazy"`, inserida após a resposta do catálogo, sem descoberta no documento inicial. No detalhe, a galeria já usa `fetchpriority="high"`, mas sua imagem também só é descoberta após bootstrap e consulta do NFT: no primeiro relatório o atraso observado até solicitar o recurso é aproximadamente 845 ms. Tempos observados dessa decomposição são distintos do LCP simulado usado na pontuação.

Prioridade futura: carregar imagens da primeira dobra sem lazy loading e reduzir JavaScript inicial mediante divisão por rotas/fluxos, conservando os mocks e suas latências. Investigar o custo do bootstrap com MSW ativo; não removê-lo para medir. Esses pontos explicam o caminho crítico encontrado, sem prometer uma pontuação após mudanças ainda não testadas. Imagens quebradas ou fontes externas lentas não foram a causa observada.

### 3. Semântica e áreas de interação (Accessibility 92–93)

- `aria-prohibited-attr`, nas duas páginas: `footer .social-list` é um `<p aria-label="...">`; o papel implícito de parágrafo não aceita esse nome acessível. Usar semântica que permita o nome ou texto visível apropriado.
- `target-size`, Home: botões de `.hero-pagination` têm 7 × 7 px no mobile e 8 × 8 px no desktop, com espaço insuficiente entre eles. Ampliar a área acionável para ao menos 24 × 24 px e garantir espaçamento, preservando a representação visual.
- `target-size`, mobile nas duas páginas: links do rodapé têm cerca de 16,5 px de altura e área livre insuficiente. Aumentar área de interação/espaçamento.
- `heading-order`, Home desktop: o `h3` “NFT em destaque” aparece antes do `h2` do catálogo. No detalhe mobile: `#nft-description-panel > h3` salta níveis na hierarquia visível. Ajustar a estrutura semântica preservando o visual.

O detalhe desktop alcança Accessibility 97 apesar de ainda apresentar o problema ARIA do rodapé. Nenhuma dessas correções foi aplicada, respeitando o escopo e os arquivos reservados.

### 4. robots.txt servido como HTML (SEO 92, meta atendida)

`robots-txt` registra 15 erros de sintaxe: a URL inexistente `/robots.txt` recebe `index.html` pelo fallback SPA do preview. Criar um arquivo robots válido e conferir a regra no deploy evita esse problema. Não foi criado nesta etapa porque a autorização de correções de produto se limitou aos metadados de `index.html`. Título, descrição e idioma já estão corrigidos e foram incluídos nas 12 medições.

Best Practices atingiu 100 em todas as medições. A ausência de sourcemaps e o bloqueio de bfcache pelo contexto da aplicação aparecem como diagnósticos, mas não explicam uma categoria abaixo da meta nesta execução. Não há evidência para priorizá-los acima de CLS, caminho crítico e acessibilidade.

## Tentativas interrompidas

Os diretórios anteriores da mesma data mantêm o registro de duas tentativas incompletas: bloqueio da conexão de depuração no sandbox e uma validação inicial que exigia WOFF apesar do uso de fonte de sistema. Elas possuem `failure.json`, não têm resumo de 12 medições válidas e não entram nas medianas acima. A execução concluída contém somente os 12 resultados aceitos.

## Correções posteriores orientadas pelas evidências

As seções anteriores preservam integralmente os resultados e o diagnóstico da primeira rodada. As correções seguintes foram feitas sobre o estado local que já incluía filtros, avaliações e o novo carrossel de relacionados, sem commit/push e sem alterar mocks ou latências.

### CLS: causa confirmada e correção

A instrumentação de `layout-shift` confirmou a origem do maior deslocamento: `margin-block: 24px` no skeleton colapsava para fora do contêiner no mobile, movendo o `body` de `y=24` para `y=0` quando o detalhe chegava. Na reprodução em 390 px, esse único evento atingiu score 1. Os retângulos e fontes dos deslocamentos foram preservados em [mobile](../artifacts/lighthouse-fixes/layout-mobile-before.json), [tablet](../artifacts/lighthouse-fixes/layout-tablet-before.json) e [desktop](../artifacts/lighthouse-fixes/layout-desktop-before.json). Os arquivos expandidos temporários dos traces foram removidos após consolidar essas evidências.

O skeleton passou a usar as mesmas classes `.nft-overview`, `.detail-mobile-topbar`, `.nft-gallery`, `.gallery-stage` e `.nft-information` do conteúdo real, sem a margem que causava colapso. A galeria mantém `aspect-ratio` e dimensões de imagem; as posições e tamanhos de skeleton e galeria foram conferidos em 390, 768 e 1440 px. O placeholder da descrição também mantém o rodapé fora da primeira dobra enquanto o conteúdo está pendente. Essa reserva foi acrescentada após reproduzir, em tablet, CLS 0,11996 causado pelo rodapé que estava visível durante o skeleton ([evidência intermediária](../artifacts/lighthouse-fixes/layout-tablet-intermediate.json)).

O selo das avaliações possui reserva durante a consulta e o resumo conserva altura/line-height entre pendente e sucesso. O skeleton de relacionados reproduz imagem quadrada, legenda, preço e paginação em grades de 2/3/5 cards nos mesmos breakpoints do carrossel. Um teste com coleção lenta reproduziu diferenças de altura de 67 px em mobile e 141 px em tablet antes dessa correção; depois, verificou compatibilidade dentro de 2 px. As alturas mínimas aplicam-se às reservas de carregamento e aos pequenos slots assíncronos; textos reais mantêm altura natural, sem overflow que os corte.

### Acessibilidade e carrosséis

- O rodapé usa papel `group` válido para nomear a apresentação das redes sociais; seus links têm área mínima de 24 px.
- O título lateral “NFT em destaque” e os subtítulos de rede/edições/procedência usam nível 2 com a mesma apresentação visual anterior.
- Pontinhos do hero continuam com 7/8 px visuais, dentro de botões de 24 × 24 px, sem sobreposição de áreas de interação.
- O hero mantém troca automática a cada cinco segundos e os pontinhos manuais. Conforme a orientação final do usuário, o controle textual de pausa/retomada fica invisível normalmente e aparece **somente em `:focus-visible`**, em posição absoluta acima dos pontinhos. Não adiciona linha nem muda as dimensões do hero. Enter/Espaço operam o botão; após sair do foco ele volta a ficar invisível. `prefers-reduced-motion: reduce` impede o autoavanço, inclusive quando a preferência muda em tempo de execução; a troca manual permanece disponível.
- O carrossel de relacionados preserva todos os cards e o scroll nativo. A faixa e a paginação têm grupos nomeados válidos; setas/Home/End e foco visível foram mantidos. Ao mudar o número de cards por página no resize, o scroll e o estado da paginação retornam juntos à primeira página. Imagens fora da primeira dobra continuam lazy.

### Performance e divisão por rotas

Os LCPs confirmados nos relatórios anteriores eram o primeiro card Emerald Ape na Home mobile e a imagem principal da galeria no detalhe. Somente o primeiro card da página do catálogo passou a `loading="eager"`/`fetchPriority="high"`; os demais cards continuam lazy. A galeria já tinha prioridade alta e foi preservada. Não foi introduzido preload global de uma obra que não pertence a todas as rotas.

As páginas passaram a ser importadas com `lazyRouteComponent` do TanStack Router. Validação de search, `beforeLoad`, `requireSession`, parâmetros, histórico e bootstrap do MSW não foram modificados. O build passou a separar Home, detalhe, autenticação, carrinho, checkout, perfil, carteiras e pedido; o chunk principal caiu de 747,86 kB (238,87 kB gzip) para aproximadamente 326 kB (100 kB gzip), sem aumentar o limite do aviso. Essa redução é do chunk principal, não uma alegação de redução equivalente em todos os bytes transferidos: chunks compartilhados e a página ativa continuam sendo carregados.

A rodada intermediária revelou que a primeira miniatura da galeria iniciava a requisição da mesma URL antes da imagem principal, sem prioridade alta, apesar do atributo na imagem principal. A primeira miniatura também recebeu `fetchPriority="high"`. Na rodada final, `lcp-discovery-insight` confirmou `priorityHinted: true` e `eagerlyLoaded: true` para o recurso LCP do detalhe. As imagens fora da primeira dobra mantêm seu lazy loading. O validador passou a percorrer também os slides horizontais depois de medir, com timeout de decode, para não ficar aguardando imagens lazy ainda fora da área visível.

## Resultado final: antes e depois

Rodada final completa: [2026-10-24T20-18-35.247Z](../artifacts/lighthouse/2026-10-24T20-18-35.247Z/summary.md), com 12 pares HTML/JSON. Os arquivos anteriores foram preservados. A comparação usa todas as três medições de cada combinação dessa rodada, sem escolher os melhores resultados entre rodadas. [Comparação JSON](../artifacts/lighthouse-fixes/comparison.json).

| Página/perfil | Performance antes → depois | Accessibility antes → depois | Best Practices | SEO | LCP antes → depois (ms) | CLS antes → depois | TBT antes → depois (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home mobile | 79 → 83 | 93 → 100 | 100 → 100 | 92 → 92 | 3655,2 → 3745,7 | 0,000025 → 0,000025 | 282 → 162 |
| NFT mobile | 63 → 87 | 92 → 100 | 100 → 100 | 92 → 92 | 3344,5 → 3393,4 | 0,988486 → 0 | 78 → 121,1 |
| Home desktop | 99 → 99 | 92 → 100 | 100 → 100 | 92 → 92 | 779,2 → 866,2 | 0,000666 → 0,000666 | 7,5 → 7,5 |
| NFT desktop | 99 → 99 | 97 → 100 | 100 → 100 | 92 → 92 | 725,7 → 805,5 | 0,057679 → 0,000666 | 0 → 0 |

Accessibility, Best Practices e SEO alcançaram suas metas em todas as combinações. Performance desktop alcançou a meta, mas **Performance mobile continua abaixo de 90 nas duas páginas**. Não há aprovação global das metas. O CLS mobile do detalhe foi eliminado nas três medições finais; o aumento de pontuação não implica melhora de todas as métricas: LCP mudou pouco e o TBT do detalhe aumentou nesta amostra. As diferenças pequenas entre rodadas são observações de laboratório, não demonstração estatística de ganho.

### Causas que permanecem abaixo da meta

- Na Home, o LCP continua sendo o primeiro card Emerald Ape, agora eager/high. O HTML inicial não contém esse card: sua montagem aguarda bootstrap, inicialização do MSW e consulta REST do catálogo, com as latências originais. Em `home-mobile-1.json`, `lcp-breakdown-insight` e a cadeia de rede permitem separar espera pelo recurso da renderização; a imagem já é compartilhada com o hero, portanto alterar apenas lazy não elimina a espera pelo catálogo.
- No detalhe, o LCP continua na imagem principal da galeria. A prioridade da requisição foi corrigida, mas a descoberta ainda depende do bootstrap e da consulta do NFT. O recurso continua ausente do documento inicial. Na rodada intermediária, `nft-001-mobile-2.json` registrou cerca de 927 ms observados de atraso até solicitar o recurso e 76 ms para carregá-lo; esses tempos observados não são o LCP simulado usado na nota.
- `unused-javascript` passou de aproximadamente 120/130 KiB para 50 KiB. Ainda há avaliação de JavaScript na thread principal. Na rodada intermediária, o detalhe registrou aproximadamente 1,18 s de avaliação de scripts; `bootup-time` atribuiu cerca de 519 ms de scripting a `browser-*.js` (mocks/MSW) e 379 ms a `session-*.js` (chunk compartilhado). Isso identifica custo concreto que a divisão das páginas não eliminou; não foi removido o MSW nem reduzida a latência para pontuar melhor.
- O CSS global ainda aparece como recurso bloqueante, com economia estimada pelo Lighthouse em torno de 150 ms. O diagnóstico de descoberta da imagem e o custo do bootstrap permanecem prioridades para uma etapa futura. Nenhuma nova otimização foi iniciada após a instrução de encerramento.
- SEO 92 permanece dentro da meta. `/robots.txt` ainda cai no HTML do fallback SPA; não foi alterado nesta etapa. Não foram adicionadas funcionalidades nem alteradas APIs ou cenários.

### Verificações e condições finais

- Lint e build passaram. O build final mantém mocks explicitamente ativados; o log está em [final-build.log](../artifacts/lighthouse-fixes/final-build.log).
- A suíte completa aprovou 96 testes, com 4 skips definidos por perfil/breakpoint, sem falhas: [log](../artifacts/lighthouse-fixes/playwright-full.log) e [status do Playwright](../artifacts/lighthouse-fixes/playwright-status.json). O PowerShell registrou o aviso `NO_COLOR` como `NativeCommandError` ao redirecionar stderr; o status do framework foi `passed`, sem failedTests.
- Após o ajuste exclusivo da prioridade da galeria, os testes diretamente afetados de galeria/CLS/carrosséis aprovaram 8 casos, com 2 skips de repetição da matriz: [status](../artifacts/lighthouse-fixes/playwright-targeted-status.json). Uma espera do teste foi corrigida para aguardar a notificação assíncrona de mudança de `prefers-reduced-motion` antes de avançar o relógio virtual; o [trace dessa falha de sincronização](../artifacts/lighthouse-fixes/hero-media-change-failure.zip) foi preservado.
- A [verificação dos relatórios finais](../artifacts/lighthouse/2026-10-24T20-18-35.247Z/verification.json) confirmou 12 HTML, 12 JSON, 12 validações, 150 ocorrências de imagens decodificadas, Consolas efetivamente renderizada, APIs medidas com sucesso e medianas recalculadas. Os hashes do build foram conferidos [antes de qualquer reconstrução posterior](../artifacts/lighthouse/2026-10-24T20-18-35.247Z/verification-at-audit.json); a conferência offline posterior não compara o dist reconstruído com esse snapshot histórico.
- Ferramentas, máquina e perfis são os mesmos da primeira rodada, registrados no novo `environment.json`/`runs.json`. Nenhum Playwright foi executado simultaneamente ao Lighthouse. Todas as execuções de auditoria foram encerradas; não foi iniciada outra após a última rodada.
- A [rodada intermediária completa](../artifacts/lighthouse/2026-10-24T20-12-14.546Z/summary.md) permanece salva. A tentativa `20-08-24.817Z` foi interrompida na validação horizontal e possui `failure.json`; não entra nas medianas finais.

### Pendência do cabeçalho responsivo

A regra entre 768 e 1199 px ainda oculta os dois últimos links. Foi implementada uma tentativa de menu compacto, mas a autorização para executar os testes do cabeçalho fora do sandbox foi recusada. Conforme a instrução final do usuário, **essa tentativa foi revertida integralmente**, inclusive seu teste novo. O cabeçalho foi conferido por SHA-256 contra a cópia anterior à tentativa; o CSS anterior do cabeçalho foi restaurado preservando as correções Lighthouse.

A correção do menu e a validação de 390, 768, 1024 e 1440 px ficam pendentes. Nenhum novo Lighthouse foi executado para essa tentativa. Lint/build foram executados novamente após a reversão. Não houve commit nem push.
