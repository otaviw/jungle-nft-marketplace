import { z } from 'zod'

export const walletNetworks = ['Ethereum', 'Polygon', 'Solana'] as const

export const walletProviders = [
    'MetaMask',
    'WalletConnect',
    'Coinbase Wallet',
] as const

export const walletSchema = z.object({
    name: z.string().trim().min(2).max(80),
    nickname: z.string().trim().min(2).max(80),
    profileName: z.string().trim().min(2).max(80),
    network: z.enum(walletNetworks),
    provider: z.enum(walletProviders),
    address: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email(),
    ens: z.string().trim().max(100).refine(
        (value) => !value || /^[a-z0-9-]+\.eth$/i.test(value),
        'Informe um nome terminado em .eth.',
    ),
    referralCode: z.string().trim().max(50),
}).superRefine((wallet, context) => {
    const valid = wallet.network === 'Solana'
        ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.address)
        : /^0x[a-fA-F0-9]{40}$/.test(wallet.address)

    if (!valid) {
        context.addIssue({
            code: 'custom',
            path: ['address'],
            message: 'Informe um endereço válido para a rede selecionada.',
        })
    }
})

export type WalletInput = z.infer<typeof walletSchema>
export type WalletSlot = 'primary' | 'secondary'

export interface Wallet extends WalletInput {
    id: string
    slot: WalletSlot
}