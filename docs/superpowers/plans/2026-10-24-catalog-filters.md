# Filtros do catálogo

Objetivo: reproduzir o painel fornecido, reutilizando React Query, TanStack Router, Base UI e MSW. Escopo e desenho definidos pelo pedido do usuário; sem mudanças em checkout, compra, avaliações ou carrosséis, sem novas dependências, commit ou push.

- [x] Cobrir aplicação combinada, URL, histórico, teclado, contagens e limites inclusivos com precisão de wei em `e2e/catalog.spec.ts`; observar falhas antes da implementação.
- [x] Ampliar `src/lib/catalog-search.ts` com as categorias da referência e validação de preços decimais opcionais (até 18 casas, não negativos; inverter limites trocados).
- [x] Expor contagens globais e preço máximo reais pelo MSW, com contrato em `src/types/nft.ts`; comparar limites em wei antes de paginar em `src/mocks/handlers.ts`.
- [x] Atualizar `src/components/home/catalog-filters.tsx` e estilos específicos em `src/marketplace.css`: linhas compactas, contagens à direita, slider Base UI com duas alças, botão Aplicar na seção de preço, preservando drawer e foco. Limpar remove somente categoria, rede e preços, preservando os demais parâmetros.
- [x] Executar somente testes afetados em desktop/mobile, lint e build; revisar diff e relatar resultados reais.

Revisão: parâmetros inválidos, limites unilaterais, limites iguais ou invertidos, precisão após restauração, controles sobrepostos e dados vazios. Contagens são globais do catálogo e incluem categorias com zero itens. Domínio visual do slider cobre o maior preço real arredondado para cima e qualquer limite presente na URL; valores decimais da URL permanecem strings até interação.

Validação: 16 testes afetados aprovados (8 desktop e 8 mobile), incluindo testes existentes de favoritos e abas em `e2e/navigation-fixes.spec.ts`, sem executar a suíte completa. `npm.cmd run lint` e `npm.cmd run build` aprovados; Vite avisa sobre chunk acima de 500 kB. Revisão independente encontrou dois problemas corrigidos com regressões RED→GREEN: leitura de preços diretamente da URL antes do JSON parsing em `src/router.tsx` e preservação de seleção/foco durante o carregamento das contagens. Conferência visual por captura do painel. Nenhum commit ou push.

A execução final usou uma configuração temporária que herdou `playwright.config.ts`, reutilizando o preview já iniciado e selecionando apenas os testes afetados; a configuração foi removida ao terminar.
