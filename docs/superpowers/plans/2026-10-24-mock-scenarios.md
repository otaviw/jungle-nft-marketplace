# Reset e cenários dos mocks

Escopo: completar as lacunas das seções 6, 7 e 9 do challenge, mantendo a arquitetura, dependências e visual existentes. Execução no repositório atual, sem commit ou push.

## Decisões

- `POST /api/scenarios/reset` limpa apenas o namespace `kurio:` e marca uma recarga obrigatória. No próximo bootstrap, a limpeza é repetida antes de recriar usuários e estoque. A nova página também descarta cache, requests, timers e sockets antigos.
- `PUT /api/scenarios/network` configura sequências de atraso e falha para consultas de catálogo, detalhe e carrinho. O MSW consome a sequência por ordem de chegada; não altera o Axios ou o QueryClient.
- `PATCH /api/scenarios/nfts/:id/availability` muda o estoque efetivo, persiste após refresh e participa das mesmas versões/eventos que mudanças de preço.
- A interrupção e reconexão do pedido já existem. Adicionar cobertura com relógio controlado, sem criar outro fluxo.

## Verificações por etapa

- [x] Escrever testes de reset integral e repetido, preservação de dados externos e descarte de dados temporários.
- [x] Escrever testes de skeletons, falhas de conexão/503 com recuperação e respostas fora de ordem.
- [x] Escrever testes de esgotamento durante checkout e reconexão de pedido pendente.
- [x] Executar os testes novos em desktop e confirmar as lacunas antes de implementar.
- [x] Implementar reset em `src/mocks/reset.ts`, handlers de cenário e bootstrap.
- [x] Implementar sequências em `src/mocks/network-scenarios.ts` e integrar aos três handlers de consulta.
- [x] Persistir estoque de cenário no store de pedidos e expor o controle no handler de catálogo.
- [x] Executar testes afetados em desktop e mobile; corrigir causas de qualquer falha sem ampliar timeouts.
- [x] Atualizar README e ARCHITECTURE com contratos, semântica de recarga e controles reais.
- [x] Executar lint e build; depois executar a suíte completa uma vez, sem outro Playwright concorrente.

## Pontos de revisão

- Reset durante requests pendentes: nenhuma escrita da página anterior deve sobreviver ao bootstrap novo.
- Reset repetido: usuários e credenciais iniciais, sem sessões ou dados privados antigos; IDs e salts podem ser recriados.
- Estoque alterado após vendas: o valor configurado representa disponibilidade atual, sem ignorar vendas anteriores ou posteriores.
- Falhas sequenciais: não consumir controles de outro recurso ou esconder erro com retries ilimitados.
- Pedido pendente: reconexão deve revalidar por REST, manter identidade e não gerar outro POST.

## Evidências

- Antes da implementação: controles de rede, reset e disponibilidade retornavam 404 nos testes novos.
- Primeira rodada desktop: oito passaram; o teste de estoque consultava antes do bootstrap do MSW após refresh. Corrigida a sincronização aguardando o carregamento real do carrinho, sem mudar timeouts.
- Rodada afetada final: 18 testes passaram, nove por viewport, incluindo escrita tardia durante reset.
- Revisão independente somente leitura: sem achados concretos.
- Lint e build com `VITE_ENABLE_MOCKS=true`: aprovados. O aviso de chunk acima de 500 kB permanece.
- Suíte completa executada uma vez após essas verificações: 60 testes aprovados em 8,5 minutos, 30 por viewport, sem Playwright concorrente.
- Conferência final dos assets: as quatro imagens referenciadas já estavam presentes; corrigida a documentação anterior que as listava como ausentes, sem alterar imagens.
