# Lighthouse — resultados reais

Execução: 2026-10-24T19:33:09.362Z. Build otimizado com VITE_ENABLE_MOCKS=true; cenário padrão.

Mediana independente de cada categoria/métrica, sem escolher uma execução representativa. LCP/TBT em ms; CLS sem unidade.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | mobile | 79 | 93 | 100 | 92 | 3655.2 | 0.0000 | 282.0 |
| nft-001 | mobile | 63 | 92 | 100 | 92 | 3344.5 | 0.9885 | 78.0 |
| home | desktop | 99 | 92 | 100 | 92 | 779.2 | 0.0007 | 7.5 |
| nft-001 | desktop | 99 | 97 | 100 | 92 | 725.7 | 0.0577 | 0.0 |

Metas: Performance/SEO ≥90; Accessibility/Best Practices ≥95. Consulte summary.json para os indicadores por categoria.

## Evidências e condições

- environment.json: ferramentas, máquina, estratégia, estado Git e configuração.
- build.log e build-sha256.json: build executado e hashes dos arquivos efetivamente servidos.
- runs.json: 12 medições, valores individuais, warnings, navegador, emulação e throttling efetivos.
- *.html / *.json: relatórios Lighthouse completos. *.validation.json: DOM, imagens decodificadas, fontes carregadas, MSW e catálogo/detalhe reais após cada medição.
- Cache/storage e perfil novos por medição. Chrome headless, throttling simulado do Lighthouse (mobile padrão e preset desktop). Não é medição em aparelho físico nem do deploy público.
- A rolagem para conferir imagens lazy e as chamadas extras à API ocorrem depois da auditoria, sem aquecer a navegação medida.
