import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { launch } from 'chrome-launcher'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'
import { pages, profiles, runs, targets, settings } from './lighthouse.config.mjs'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')
process.chdir(root)
const startedAt = new Date().toISOString()
const output = resolve(root, 'artifacts/lighthouse', startedAt.replaceAll(':', '-'))
await mkdir(output, { recursive: true })
const save = (name, data) => writeFile(join(output, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n')
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const results = []
let server

async function hashes(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const result = {}
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) Object.assign(result, await hashes(path))
    else result[path.slice(root.length + 1).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(path)).digest('hex')
  }
  return result
}

// This runs AFTER the measured navigation, without modifying the measured page.
// Scroll only here to validate native lazy images outside the initial viewport.
async function validate(page, name, id) {
  await page.waitForFunction(isHome => isHome
    ? document.querySelectorAll('#catalogo .nft-card').length > 0
    : document.querySelector('h1')?.textContent === 'Emerald Ape #001', { timeout: 20000 }, name === 'home')
  await page.evaluate(async () => {
    await document.fonts.ready
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
      scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    // Native lazy loading also applies to horizontally clipped carousel pages.
    // Visit each page after Lighthouse has finished, without changing loading hints.
    for (const track of document.querySelectorAll('[aria-roledescription="carrossel"] [tabindex="0"]')) {
      track.scrollIntoView({ block: 'center', behavior: 'instant' })
      for (let x = 0; x < track.scrollWidth; x += track.clientWidth) {
        track.scrollTo({ left: x, behavior: 'instant' })
        await new Promise(resolve => setTimeout(resolve, 250))
      }
    }
    await Promise.race([
      Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode())),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo excedido ao decodificar imagens após percorrer a página e o carrossel')), 10000)),
    ])
  })
  const evidence = await page.evaluate(async () => {
    const get = async path => {
      const response = await fetch(path)
      return { status: response.status, body: await response.json() }
    }
    const images = [...document.images].filter(image => image.getClientRects().length).map(image => ({
      src: image.currentSrc, alt: image.alt, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight,
    }))
    return {
      url: location.href, title: document.title, lang: document.documentElement.lang,
      headings: [...document.querySelectorAll('h1')].map(node => node.textContent),
      errors: [...document.querySelectorAll('.market-error,[role="alert"]')].map(node => node.textContent).filter(Boolean),
      catalogCards: document.querySelectorAll('#catalogo .nft-card').length,
      relatedCards: document.querySelectorAll('.related-nfts article').length,
      images, fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })),
      bodyFont: getComputedStyle(document.body).fontFamily,
      fontResources: performance.getEntriesByType('resource').filter(entry => /\.woff2?(\?|$)/.test(entry.name)).map(entry => ({ url: entry.name, duration: entry.duration, transferSize: entry.transferSize })),
      serviceWorker: navigator.serviceWorker.controller?.scriptURL,
      scenarioKeys: Object.keys(localStorage).filter(key => key.startsWith('kurio:scenario:')),
      catalog: await get('/api/nfts'), detail: await get('/api/nfts/nft-001'),
    }
  })
  const session = await page.createCDPSession()
  try {
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
    evidence.renderedFonts = (await session.send('CSS.getPlatformFontsForNode', { nodeId })).fonts
  } finally {
    await session.detach()
  }
  await save(`${id}.validation.json`, evidence)
  assert.equal(evidence.errors.length, 0, 'Página contém mensagem de erro')
  assert.ok(evidence.serviceWorker?.endsWith('/mockServiceWorker.js'), 'MSW não está controlando a página')
  assert.equal(evidence.scenarioKeys.length, 0, 'Cenário customizado ativo')
  assert.equal(evidence.catalog.status, 200)
  assert.equal(evidence.catalog.body.total, 24)
  assert.ok(evidence.catalog.body.items.some(nft => nft.id === 'nft-001'))
  assert.equal(evidence.detail.status, 200)
  assert.equal(evidence.detail.body.name, 'Emerald Ape #001')
  assert.ok(evidence.images.length > 0 && evidence.images.every(image => image.complete && image.width > 0), 'Imagem quebrada')
  // The current CSS uses system monospace fonts. An unused @font-face import
  // does not trigger a request: validate the actual rendered glyphs via CDP.
  assert.ok(evidence.renderedFonts.some(font => font.glyphCount > 0), 'Nenhuma fonte renderizou o título')
  if (name === 'home') assert.ok(evidence.catalogCards > 0)
  else assert.ok(evidence.relatedCards > 0)
  return evidence
}

try {
  console.log('Build de produção com VITE_ENABLE_MOCKS=true...')
  const build = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
    cwd: root, env: { ...process.env, VITE_ENABLE_MOCKS: 'true' }, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  })
  await save('build.log', `${build.stdout ?? ''}\n${build.stderr ?? ''}`)
  assert.equal(build.status, 0, 'Build falhou; consulte build.log')
  await save('build-sha256.json', await hashes(join(root, 'dist')))
  // strictPort prevents silently auditing another server or development build.
  server = await preview({ root, preview: { host: '127.0.0.1', port: 4175, strictPort: true, open: false } })
  const origin = 'http://127.0.0.1:4175'
  const environment = {
    startedAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    node: process.version, npm: process.env.npm_config_user_agent,
    versions: Object.fromEntries(['lighthouse', 'puppeteer-core', 'chrome-launcher', 'vite'].map(name => [name, require(`${name}/package.json`).version])),
    os: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryGiB: os.totalmem() / 1024 ** 3 },
    origin, mocks: true, scenario: 'default; fresh Chrome user data directory for every run',
    execution: '12 sequential cold navigations; no Playwright launched; native image/font requests; no content, motion or feature overrides; validation scroll/API checks only after measurement',
    gitHead: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    gitStatusBefore: spawnSync('git', ['status', '--short'], { encoding: 'utf8' }).stdout,
    targets, settings, pages, profiles, runs,
  }
  await save('environment.json', environment)
  for (const profile of profiles) {
    for (const entry of pages) {
      for (let run = 1; run <= runs; run++) {
        const id = `${entry.name}-${profile}-${run}`
        console.log(`Auditando ${id}...`)
        const chrome = await launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'] })
        let browser
        try {
          browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` })
          const page = await browser.newPage()
          const config = profile === 'desktop'
            ? { ...desktopConfig, settings: { ...desktopConfig.settings, ...settings } }
            : { extends: 'lighthouse:default', settings }
          const report = await lighthouse(origin + entry.path, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config, page)
          assert.ok(report, 'Lighthouse não retornou relatório')
          const { lhr } = report
          await save(`${id}.html`, report.report[0])
          await save(`${id}.json`, report.report[1])
          assert.ok(!lhr.runtimeError, `Auditoria inválida: ${JSON.stringify(lhr.runtimeError)}`)
          assert.equal(new URL(lhr.finalDisplayedUrl).pathname, entry.path, 'Redirecionamento inesperado')
          const evidence = await validate(page, entry.name, id)
          const network = lhr.audits['network-requests'].details.items
          const requiredApis = entry.name === 'home' ? ['/api/nfts'] : ['/api/nfts/nft-001', '/api/nfts']
          for (const path of requiredApis) {
            assert.ok(network.some(item => new URL(item.url).pathname === path && item.statusCode === 200 && item.finished), `API não carregou durante a medição: ${path}`)
          }
          evidence.measuredResourceErrors = network.filter(item => item.statusCode >= 400 || item.failed)
          // Anonymous /session returning 401 is expected, unlike broken assets.
          assert.ok(!evidence.measuredResourceErrors.some(item => ['Image', 'Font', 'Script', 'Stylesheet', 'Document'].includes(item.resourceType)), 'Recurso obrigatório falhou durante a medição')
          await save(`${id}.validation.json`, evidence)
          const row = {
            id, page: entry.name, profile, run, valid: true,
            scores: Object.fromEntries(Object.keys(targets).map(key => {
              assert.equal(typeof lhr.categories[key].score, 'number')
              return [key, lhr.categories[key].score * 100]
            })),
            metrics: Object.fromEntries(['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time'].map(key => [key, lhr.audits[key].numericValue])),
            warnings: lhr.runWarnings, environment: lhr.environment, configSettings: lhr.configSettings,
          }
          results.push(row)
          await save('runs.json', results)
          console.log(`${id}: ${JSON.stringify(row.scores)}`)
        } finally {
          browser?.disconnect()
          await chrome.kill()
        }
      }
    }
  }
  assert.equal(results.length, 12)
  assert.deepEqual(await hashes(join(root, 'dist')), JSON.parse(await readFile(join(output, 'build-sha256.json'), 'utf8')), 'O build foi alterado durante as auditorias')
  const medians = profiles.flatMap(profile => pages.map(entry => {
    const group = results.filter(row => row.profile === profile && row.page === entry.name)
    assert.equal(group.length, 3)
    const scores = Object.fromEntries(Object.keys(targets).map(key => [key, median(group.map(row => row.scores[key]))]))
    return {
      page: entry.name, profile, scores,
      metrics: Object.fromEntries(Object.keys(group[0].metrics).map(key => [key, median(group.map(row => row.metrics[key]))])),
      meetsTargets: Object.fromEntries(Object.keys(targets).map(key => [key, scores[key] >= targets[key]])),
    }
  }))
  await save('summary.json', { startedAt, completedAt: new Date().toISOString(), validRuns: results.length, targets, medians })
  const lines = [
    '# Lighthouse — resultados reais', '', `Execução: ${startedAt}. Build otimizado com VITE_ENABLE_MOCKS=true; cenário padrão.`, '',
    'Mediana independente de cada categoria/métrica, sem escolher uma execução representativa. LCP/TBT em ms; CLS sem unidade.', '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...medians.map(row => `| ${row.page} | ${row.profile} | ${row.scores.performance} | ${row.scores.accessibility} | ${row.scores['best-practices']} | ${row.scores.seo} | ${row.metrics['largest-contentful-paint'].toFixed(1)} | ${row.metrics['cumulative-layout-shift'].toFixed(4)} | ${row.metrics['total-blocking-time'].toFixed(1)} |`), '',
    'Metas: Performance/SEO ≥90; Accessibility/Best Practices ≥95. Consulte summary.json para os indicadores por categoria.', '',
    '## Evidências e condições', '',
    '- environment.json: ferramentas, máquina, estratégia, estado Git e configuração.',
    '- build.log e build-sha256.json: build executado e hashes dos arquivos efetivamente servidos.',
    '- runs.json: 12 medições, valores individuais, warnings, navegador, emulação e throttling efetivos.',
    '- *.html / *.json: relatórios Lighthouse completos. *.validation.json: DOM, imagens decodificadas, fontes carregadas, MSW e catálogo/detalhe reais após cada medição.',
    '- Cache/storage e perfil novos por medição. Chrome headless, throttling simulado do Lighthouse (mobile padrão e preset desktop). Não é medição em aparelho físico nem do deploy público.',
    '- A rolagem para conferir imagens lazy e as chamadas extras à API ocorrem depois da auditoria, sem aquecer a navegação medida.',
  ]
  await save('summary.md', lines.join('\n') + '\n')
  console.log(`12 auditorias válidas. Relatórios: ${output}`)
} catch (error) {
  await save('failure.json', { at: new Date().toISOString(), validRuns: results.length, error: error.stack })
  console.error(error)
  process.exitCode = 1
} finally {
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
}
