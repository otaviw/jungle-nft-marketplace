# Carrinho, checkout e recibo

**Objetivo:** adaptar as três telas à identidade do marketplace, preservando a compra simulada e a revisão de home/detalhe.

**Referências:** os quatro frames de carrinho/pagamento em `pages figma/Desktop` e `pages figma/Mobile`, abertos antes das alterações. Não há frame de recibo; ele seguirá os componentes e a hierarquia de resumo dessas páginas.

**Decisões:** reutilizar header/footer existentes; criar apenas apresentação compartilhada para linhas e totais. Os campos de carteira do checkout serão leituras da carteira selecionada, com edição na rota de carteiras. Nome/e-mail/notas permanecem no draft e no coletor do pedido. A carteira completa já pertence ao snapshot da cotação; não é necessário estender o contrato. O resumo prévio vem do carrinho, explicitamente estimado; confirmar exige cotação revisada como antes. No mobile, perfil recolhível e botão de ação com espaço reservado para não cobrir conteúdo.

**Restrições:** sem alterações em fixtures, regras de compra, bibliotecas ou estilos de home/detalhe. Sem commit. Sem ocultar overflow horizontal em html/body.

- [x] Registrar teste de integração de perfil/carteira/draft/snapshot e reproduzir a falha antes da implementação.
- [x] Criar layout e resumo compartilhados, adaptar carrinho e estados vazio/erro/carregando.
- [x] Adaptar checkout preservando conexão, revisão, invalidação de cotação, idempotência e recuperação.
- [x] Adaptar recibo pendente/confirmado/recusado e recuperação REST/Socket.IO sem novo pedido.
- [x] Capturar/inspecionar 390, 414, 768 e 1440 px, comparando desktop/mobile separadamente. Investigar overflow também com menus, diálogos e zoom.
- [x] Executar lint, build e testes afetados sequencialmente, documentar resultados e limitações.

**Registro da investigação:** as auditorias no Opera GX e Chromium não reproduziram o arrasto horizontal em 390, 414 e 768 px; não foi aplicada ocultação global. O usuário relatou necessidade de F5 na conferência manual e considerou a situação tranquila. Não foi atribuída uma causa sem evidência; os resultados estão em `docs/commerce-review.md`.
