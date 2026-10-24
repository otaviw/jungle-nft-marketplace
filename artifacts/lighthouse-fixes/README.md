# Artefatos preservados

- Relatórios finais: [HTML/JSON e resumo](../lighthouse/2026-10-24T20-18-35.247Z/summary.md).
- Baseline original: [HTML/JSON e resumo](../lighthouse/2026-10-24T19-33-09.362Z/summary.md).
- Rodada intermediária: [HTML/JSON e resumo](../lighthouse/2026-10-24T20-12-14.546Z/summary.md).
- [Comparação das medianas](comparison.json) e [análise das causas e pendências](../../docs/lighthouse-audit.md).
- `layout-*-before.json` e `layout-tablet-intermediate.json`: evidências consolidadas dos retângulos e fontes de CLS, substituindo os diretórios temporários de traces expandidos.
- `playwright-full.log`, `playwright-status.json` e `playwright-targeted-status.json`: resultados dos testes; `hero-media-change-failure.zip`: diagnóstico da sincronização do teste com media queries.
- `final-lint.log` e `final-build.log`: verificação após reverter a tentativa incompleta do cabeçalho.
- `before/`: cópias do estado local anterior às alterações, preservadas para distinguir o trabalho preexistente e permitir conferência da reversão do cabeçalho.

Capturas extraídas sem referência (`diagnostic-frame-375.jpg` e `diagnostic-frame-1500.jpg`) e diretórios temporários de traces expandidos foram removidos. As capturas de 750/1125 ms citadas na análise foram mantidas. Assets do site, baselines Playwright e relatórios HTML/JSON não foram removidos.

## Arquivos de implementação alterados nesta etapa

`src/router.tsx`, `src/marketplace.css`, `src/pages/nft-detail.tsx`, `src/components/home/hero.tsx`, `src/components/home/catalog.tsx`, `src/components/layout/marketplace-footer.tsx`, `src/components/nft/nft-gallery.tsx`, `src/components/nft/nft-reviews.tsx`, `src/components/nft/nft-reviews.css`, `src/components/nft/related-carousel.tsx`, `e2e/lighthouse-regressions.spec.ts`, `e2e/mock-scenarios.spec.ts` e `scripts/lighthouse.mjs`, além de README, análise e plano. Alterações locais anteriores nos demais arquivos foram preservadas. A tentativa posterior de alteração em `marketplace-header.tsx` e no CSS do cabeçalho foi revertida; o teste novo dessa tentativa foi removido.
