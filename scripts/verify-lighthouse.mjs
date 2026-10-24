import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

// Offline verification of saved evidence; does not launch a browser or audit.
const base = process.argv[2]
assert.ok(base, 'Uso: node scripts/verify-lighthouse.mjs artifacts/lighthouse/<execução>')
const read = name => JSON.parse(readFileSync(join(base, name), 'utf8'))
const runs = read('runs.json')
const summary = read('summary.json')
assert.equal(runs.length, 12)
assert.equal(summary.validRuns, 12)
assert.equal(new Set(runs.map(run => run.id)).size, 12)
let images = 0
const fonts = new Set()
for (const run of runs) {
  const lhr = read(`${run.id}.json`)
  const evidence = read(`${run.id}.validation.json`)
  assert.ok(!lhr.runtimeError)
  assert.ok(statSync(join(base, `${run.id}.html`)).size > 10000)
  assert.equal(evidence.errors.length, 0)
  assert.equal(evidence.scenarioKeys.length, 0)
  assert.equal(evidence.catalog.body.total, 24)
  assert.equal(evidence.detail.body.id, 'nft-001')
  assert.ok(evidence.serviceWorker.endsWith('/mockServiceWorker.js'))
  assert.ok(evidence.images.length > 0 && evidence.images.every(image => image.complete && image.width > 0))
  images += evidence.images.length
  assert.ok(evidence.renderedFonts.some(font => font.glyphCount > 0))
  evidence.renderedFonts.forEach(font => fonts.add(font.familyName))
  const network = lhr.audits['network-requests'].details.items
  for (const api of run.page === 'home' ? ['/api/nfts'] : ['/api/nfts/nft-001', '/api/nfts']) {
    assert.ok(network.some(item => new URL(item.url).pathname === api && item.statusCode === 200 && item.finished), `${run.id}: ${api}`)
  }
  assert.ok(!network.some(item => (item.statusCode >= 400 || item.failed) && ['Image', 'Font', 'Script', 'Stylesheet', 'Document'].includes(item.resourceType)))
  for (const [key, value] of Object.entries(run.scores)) assert.equal(value, lhr.categories[key].score * 100)
  for (const [key, value] of Object.entries(run.metrics)) assert.equal(value, lhr.audits[key].numericValue)
}
assert.equal(summary.medians.length, 4)
for (const row of summary.medians) {
  const group = runs.filter(run => run.page === row.page && run.profile === row.profile)
  assert.equal(group.length, 3)
  for (const section of ['scores', 'metrics']) {
    for (const [key, value] of Object.entries(row[section])) {
      assert.equal(value, group.map(run => run[section][key]).sort((a, b) => a - b)[1])
    }
  }
}
// Hashes describe the audited snapshot; later rebuilds may legitimately differ.
// Use --check-build immediately after auditing to assert the current dist matches.
const checkBuild = process.argv.includes('--check-build')
if (checkBuild) {
  for (const [file, hash] of Object.entries(read('build-sha256.json'))) {
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), hash, file)
  }
}
const result = {
  verifiedAt: new Date().toISOString(), validRuns: runs.length,
  htmlReports: 12, jsonReports: 12, validationFiles: 12,
  decodedImageOccurrences: images, renderedFonts: [...fonts],
  measuredApisSuccessful: true, mediansRecomputed: true,
  buildHashesChecked: checkBuild,
}
writeFileSync(join(base, 'verification.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
