# Avaliações demonstrativas de colecionadores

Objetivo: substituir os placeholders de avaliações no detalhe sem alterar filtros, hero, relacionados, compra ou contratos de checkout. Reutilizar React Query, MSW e lucide-react; sem novas dependências, commit ou push.

Arquitetura: endpoint independente `GET /api/nfts/:nftId/reviews`, tipos próprios, fixtures determinísticas. O Emerald Ape principal existente (`nft-001`) recebe 19 comentários (15 notas 5 e quatro notas 4), média arredondada 4,8. Resumo sempre derivado dos comentários pelo MSW. Outros NFTs recebem subconjuntos determinísticos com médias próprias.

- [x] Criar testes focados em API/fixtures, selo/resumo, clique/teclado das abas, datas, comentários e overflow mobile; observar falhas antes da implementação.
- [x] Criar `src/types/review.ts`, `src/mocks/review-fixtures.ts`, `src/mocks/review-handlers.ts`; registrar os handlers sem modificar os contratos de NFT/checkout.
- [x] Criar `src/components/nft/nft-reviews.tsx` e `src/components/nft/nft-reviews.css` com selo, resumo, estrelas proporcionais decorativas e comentários somente leitura. Integrar em `src/pages/nft-detail.tsx`, preservando o comportamento das abas.
- [x] Atualizar somente a expectativa de avaliações do teste existente `e2e/nft-gallery.spec.ts`.
- [x] Executar somente os testes afetados, lint e build; revisar escopo e relatar resultados reais.

Revisão: média e quantidade coerentes para cada NFT, nenhuma dependência do relógio, datas sem deslocamento de fuso, texto acessível para estrelas, nenhum formulário de envio, consulta vinculada ao NFT atual, selo e comentários sem overflow em telas estreitas. CSS exclusivamente prefixado para avaliações; nenhuma alteração no CSS global, filtros ou hero.

Validação: 8 testes afetados aprovados (4 desktop, 4 mobile), somente `e2e/nft-reviews.spec.ts` e `e2e/nft-gallery.spec.ts`. A execução usou configuração temporária herdada de Playwright e preview na porta 4181; configuração removida ao concluir. Teste de API observado falhando antes de implementar o endpoint MSW. Lint e build completos aprovados ao final; tentativas iniciais foram bloqueadas por alterações simultâneas no hero, que não foi editado por esta tarefa. Vite mantém aviso de chunk acima de 500 kB. Conferência visual em 1440, 390 e 320 px, sem overflow horizontal. Revisão independente sem defeitos encontrados. Sem commit ou push.
