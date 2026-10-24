# Correções orientadas pelos relatórios Lighthouse

Objetivo: corrigir CLS, acessibilidade e caminho crítico mobile sem remover conteúdo, mudar mocks, composição final ou fluxos. Trabalhar sobre o estado local existente (cópias dos arquivos tocados em `artifacts/lighthouse-fixes/before`), sem commit/push.

- [x] Reproduzir com Playwright o deslocamento da galeria/skeleton nos breakpoints 390, 768 e 1440 e registrar fontes de layout-shift antes de corrigir.
- [x] Alinhar skeleton e conteúdo final com as mesmas classes de geometria; reservar badge/resumo e relacionados assíncronos usando dimensões mínimas e aspect-ratio, sem cortar texto.
- [x] Corrigir ARIA do rodapé, títulos e alvos; pontinhos pequenos dentro de botões maiores; pausa do hero com preferência de movimento reduzido e navegação manual; verificar teclado e resize dos relacionados.
- [x] Priorizar somente os cards LCP confirmados na primeira linha, manter lazy nos demais e galeria com prioridade alta. Separar módulos das páginas com lazyRouteComponent, mantendo beforeLoad e validação de search no router.
- [x] Executar lint, build e testes de layout, carrosséis, filtros, avaliações, rotas protegidas e compra afetados. Em seguida, executar 12 auditorias Lighthouse sequenciais e verificar as evidências salvas.
- [x] Atualizar docs/lighthouse-audit.md com resultados antes/depois, causas ainda presentes e limitações reais. Preservar relatórios anteriores.

Critérios: CLS de laboratório abaixo de 0,1; metas P/SEO >=90 e A/BP >=95. Se não atingidas, registrar valor e diagnóstico; nunca remover funcionalidades ou reduzir latências para aumentar nota. Não executar Playwright ao mesmo tempo que Lighthouse.

Correção de escopo recebida durante a execução: o controle de pausa deve permanecer invisível na apresentação normal e aparecer somente ao receber foco pelo teclado, sobreposto em posição absoluta, sem mudar a geometria do hero. Autoavanço e pontinhos permanecem.

Revisão estática independente: sem problemas críticos. Reserva incompleta de relacionados confirmada por teste lento (67/141/85 px de diferença) e corrigida com skeleton de imagem/legenda/preço/paginação. Estilo de retry do resumo preservado. A revisão não executou navegador nem validou pontuações; essas verificações dependem das execuções reais registradas no relatório final.

Encerramento solicitado: nenhuma nova auditoria após `2026-10-24T20-18-35.247Z`. Tentativa posterior de cabeçalho revertida por falta de autorização para a validação do navegador, conforme condição explícita do usuário. Limpeza restrita a capturas temporárias sem referência e cópias expandidas dos traces após consolidar os dados necessários.
