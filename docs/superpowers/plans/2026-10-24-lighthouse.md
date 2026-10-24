# Plano de execução das auditorias Lighthouse

Objetivo: executar Home e `/nfts/nft-001`, mobile e desktop, três vezes por combinação, no build otimizado com mocks padrão.

Restrições: preservar alterações locais; sem commit/push, Playwright concorrente, alterações de mocks ou otimizações. Somente metadados básicos autorizados em `index.html`.

- [x] Fixar dependências e criar `scripts/lighthouse.mjs`: build com variável explícita, preview local, Chrome isolado por medição, Lighthouse sequencial, validação do conteúdo real e recursos, HTML/JSON, medianas e condições.
- [x] Executar as 12 medições e rejeitar runtime errors, conteúdo ausente, recursos quebrados e cenário não padrão.
- [x] Analisar auditorias abaixo das metas com evidências dos JSON; registrar causas e prioridades sem corrigir componentes.
- [x] Atualizar o README preservando seu conteúdo atual e verificar os 12 pares de relatórios, medianas, versões e diff restrito.

Verificação: `npm run audit:lighthouse` deve produzir 12 resultados válidos e 24 relatórios. Metas não atingidas são resultados da auditoria, não falha de execução; erros de carregamento devem interromper a execução. Build e evidências de cada medição ficam salvos junto ao resumo. Nenhum teste Playwright será iniciado.
