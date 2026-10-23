import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { WalletForm } from '@/components/account/wallet-form'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { sessionOptions } from '@/lib/session'
import type { Wallet } from '@/lib/wallet-schema'

export function WalletsPage() {
    const session = useQuery(sessionOptions)
    const userId = session.data?.user.id

    const wallets = useQuery({
        queryKey: ['wallets', userId],
        enabled: Boolean(userId),
        queryFn: async ({ signal }) => {
            const response = await api.get<Wallet[]>('/wallets', { signal })

            return response.data
        },
    })

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
                <div className="grid items-start gap-8 md:grid-cols-[220px_1fr]">
                    <aside className="space-y-4 rounded bg-card p-5 text-sm">
                        <h2 className="font-bold">Meu perfil</h2>
                        <Link to="/profile" className="block">Dados do perfil</Link>
                        <Link
                            to="/wallets"
                            aria-current="page"
                            className="block border-l-2 border-primary pl-3 text-primary"
                        >
                            Carteiras
                        </Link>
                    </aside>

                    <div>
                        <h1 className="sr-only">Suas carteiras</h1>

                        {wallets.isPending && (
                            <div role="status">
                                <span className="sr-only">Carregando carteiras</span>
                                <div
                                    aria-hidden="true"
                                    className="catalog-shimmer h-96 rounded-xl"
                                />
                            </div>
                        )}

                        {wallets.isError && (
                            <div role="alert">
                                <p>Não foi possível carregar as carteiras.</p>
                                <Button
                                    className="mt-4"
                                    onClick={() => void wallets.refetch()}
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        )}

                        {wallets.data && userId && (
                            <div className="space-y-12">
                                <WalletForm
                                    key={`${userId}-primary`}
                                    slot="primary"
                                    userId={userId}
                                    wallet={wallets.data.find(
                                        (wallet) => wallet.slot === 'primary',
                                    )}
                                />

                                <div className="border-t border-border pt-8">
                                    <WalletForm
                                        key={`${userId}-secondary`}
                                        slot="secondary"
                                        userId={userId}
                                        wallet={wallets.data.find(
                                            (wallet) => wallet.slot === 'secondary',
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}