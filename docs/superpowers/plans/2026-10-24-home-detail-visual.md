# Home e detalhe: ajuste visual

Referências inspecionadas: `pages figma/Desktop/Início.png`, `pages figma/Desktop/Detalhes do NFT.png` e equivalentes mobile. Desktop em 1440 px com conteúdo de 1200 px; mobile de referência em 414 px, adaptado para 390 px. Conferir também 768 px.

- [x] Capturar o estado atual no navegador.
- [x] Ajustar tokens compartilhados, usando Consolas com fallback monoespaçado documentado após comparação de Courier New com a referência.
- [x] Compor header, hero, catálogo lateral, cards, seções inferiores, footer e navegação mobile, somente em home/detalhe.
- [x] Implementar galeria com seleção de recortes da imagem fornecida e ampliação acessível.
- [x] Reorganizar edição/quantidade sem alterar mutations ou limites de estoque; alinhar nomes acessíveis aos rótulos e adaptar seletores dos testes.
- [x] Testar galeria e preservar/adaptar testes de URL, favoritos e atualização de preço.
- [x] Capturar e inspecionar home/detalhe em 390, 768 e 1440 px; verificar imagens e overflow e corrigir diferenças.
- [x] Executar lint, build e testes afetados; documentar diferenças e screenshots de revisão, sem baselines definitivas.

Limites: sem alteração da composição de conta, carrinho ou checkout; sem novas imagens, bibliotecas ou regras de compra. Dados ausentes (avaliações, ranking, outras edições, newsletter e conteúdo editorial) não devem ser apresentados como integrações funcionais.

## Validação

- Capturas antes/depois e comparação com os quatro PNGs locais.
- Capturas finais no preview de produção: imagens carregadas, documento com 390/768/1440 px correspondendo ao viewport em todas as seis combinações.
- Teste novo de galeria observado falhando antes da implementação. Teste de teclado das abas observado falhando e corrigido.
- Ajustes durante validação: label da ordenação, label exclusivo da quantidade, espera da busca recolhida no desktop, sobreposição da barra mobile e texto auxiliar causando overflow.
- Revisão independente: nomes dos controles alinhados ao texto visível e navegação das abas completada; nova revisão sem achados adicionais.
- Lint aprovado; build com mocks aprovado, mantendo o aviso de chunk acima de 500 kB.
- Rodada final dos testes afetados: 38 aprovados, 19 por viewport, em 4,6 minutos. Sem Playwright concorrente.
