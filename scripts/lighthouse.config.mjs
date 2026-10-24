// Lighthouse defaults supply mobile emulation and simulated Slow 4G/4x CPU.
// The desktop preset supplies desktop emulation and its own throttling values.
export const pages = [
  { name: 'home', path: '/' },
  { name: 'nft-001', path: '/nfts/nft-001' },
]
export const profiles = ['mobile', 'desktop']
export const runs = 3
export const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
export const settings = {
  onlyCategories: Object.keys(targets),
  throttlingMethod: 'simulate',
  disableStorageReset: false,
  maxWaitForLoad: 60000,
}
