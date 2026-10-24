import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout, sessionOptions } from '@/lib/session'

export function AccountMenu() {
    const session = useQuery(sessionOptions)

    const signOut = useMutation({
        mutationFn: logout,
    })

    if (session.isPending) {
        return <span className="text-xs">Carregando conta...</span>
    }

    if (session.isError) {
        return (
            <Button variant="outline" onClick={() => void session.refetch()}>
                Tentar carregar conta
            </Button>
        )
    }

    if (!session.data) {
        return (
            <Link
                to="/login"
                search={{ mode: 'login', redirect: '/' }}
                className="account-login inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
                <LogIn size={17} aria-hidden="true" />
                Entrar
            </Link>
        )
    }

    return (
        <div className="account-menu">
            <Link
                to="/profile"
                className="account-name text-xs underline underline-offset-4"
                title={session.data.user.name}
            >
                {session.data.user.name}
            </Link>

            <Button
                variant="outline"
                disabled={signOut.isPending}
                onClick={() => signOut.mutate()}
            >
                {signOut.isPending ? 'Saindo...' : 'Sair'}
            </Button>

            {signOut.isError && (
                <p role="alert" className="text-xs">
                    Não foi possível sair. Tente novamente.
                </p>
            )}
        </div>
    )
}