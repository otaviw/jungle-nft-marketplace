import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Eye, EyeOff, X } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/home/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { acceptSession } from '@/lib/session'
import { parseCatalogSearch } from '@/lib/catalog-search'
import type { Session } from '@/types/auth'

interface AuthError {
    message?: string
    errors?: Record<string, string[]>
}

interface AuthInput {
    name: string
    email: string
    password: string
}

export function AuthPage() {
    const { mode, redirect } = useSearch({ from: '/login' })
    const navigate = useNavigate({ from: '/login' })
    const dialogRef = useRef<HTMLDialogElement>(null)

    const [showPassword, setShowPassword] = useState(false)
    const [confirmationError, setConfirmationError] = useState('')

    const registering = mode === 'register'

    const authenticate = useMutation({
        mutationFn: async (input: AuthInput) => {
            const response = await api.post<Session>(
                registering ? '/auth/register' : '/auth/login',
                input,
            )

            return response.data
        },
        onSuccess: async (session) => {
            await acceptSession(session)

            // Recarrega a rota de destino com a nova sessão.
            // O destino é validado na configuração da rota.
            window.location.assign(redirect)
        },
    })

    useEffect(() => {
        const dialog = dialogRef.current

        if (!dialog) {
            return
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        dialog.showModal()

        return () => {
            dialog.close()
            document.body.style.overflow = previousOverflow
        }
    }, [])

    const responseError = axios.isAxiosError<AuthError>(authenticate.error)
        ? authenticate.error.response?.data
        : undefined

    function switchMode(nextMode: 'login' | 'register') {
        authenticate.reset()
        setConfirmationError('')
        setShowPassword(false)

        void navigate({
            search: { mode: nextMode, redirect },
            replace: true,
        })
    }

    return (
        <>
            <div aria-hidden="true" className="hidden md:block">
                <Header />
                <Hero />
            </div>

            <dialog
                ref={dialogRef}
                aria-labelledby="auth-title"
                aria-describedby="auth-description"
                className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-y-auto border-0 bg-background p-6 text-foreground backdrop:bg-black/60 md:h-auto md:max-h-[90dvh] md:w-[420px] md:border-b-4 md:border-primary md:bg-card md:p-10"
                onCancel={(event) => {
                    event.preventDefault()

                    void navigate({
                        to: '/',
                        search: parseCatalogSearch({}),
                    })
                }}
            >
                <Link
                    to="/"
                    search={parseCatalogSearch({})}
                    aria-label="Fechar e voltar ao início"
                    className="absolute top-4 right-4 rounded p-1 text-muted-foreground"
                >
                    <X size={20} aria-hidden="true" />
                </Link>

                <p className="mt-12 text-center text-2xl font-bold tracking-widest md:hidden">
                    KURIO
                </p>

                <nav
                    aria-label="Acesso à conta"
                    className="mt-10 flex justify-center gap-3 md:mt-0"
                >
                    <button
                        type="button"
                        disabled={authenticate.isPending}
                        aria-current={!registering ? 'page' : undefined}
                        className={!registering ? 'text-primary' : 'text-foreground'}
                        onClick={() => switchMode('login')}
                    >
                        Entrar
                    </button>

                    <span aria-hidden="true">|</span>

                    <button
                        type="button"
                        disabled={authenticate.isPending}
                        aria-current={registering ? 'page' : undefined}
                        className={registering ? 'text-primary' : 'text-foreground'}
                        onClick={() => switchMode('register')}
                    >
                        Criar conta
                    </button>
                </nav>

                <h1 id="auth-title" className="sr-only">
                    {registering ? 'Criar perfil de colecionador' : 'Entrar na Kurio'}
                </h1>

                <p
                    id="auth-description"
                    className="mt-6 text-center text-xs leading-5 text-muted-foreground"
                >
                    {registering
                        ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
                        : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
                </p>

                <form
                    key={mode}
                    className="mt-6 space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        setConfirmationError('')

                        const form = new FormData(event.currentTarget)
                        const password = String(form.get('password') ?? '')

                        if (
                            registering
                            && password !== String(form.get('confirmation') ?? '')
                        ) {
                            setConfirmationError('As senhas precisam ser iguais.')
                            return
                        }

                        authenticate.mutate({
                            name: String(form.get('name') ?? '').trim(),
                            email: String(form.get('email') ?? '').trim(),
                            password,
                        })
                    }}
                >
                    {registering && (
                        <label className="block text-xs">
                            Nome de usuário
                            <Input
                                name="name"
                                autoComplete="nickname"
                                required
                                minLength={2}
                                maxLength={80}
                                disabled={authenticate.isPending}
                                aria-invalid={Boolean(responseError?.errors?.name)}
                                aria-describedby="name-error"
                                className="mt-2"
                            />
                            <span id="name-error" className="mt-1 block">
                                {responseError?.errors?.name?.[0]}
                            </span>
                        </label>
                    )}

                    <label className="block text-xs">
                        E-mail
                        <Input
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            disabled={authenticate.isPending}
                            aria-invalid={Boolean(responseError?.errors?.email)}
                            aria-describedby="email-error"
                            className="mt-2"
                        />
                        <span id="email-error" className="mt-1 block">
                            {responseError?.errors?.email?.[0]}
                        </span>
                    </label>

                    <label htmlFor="auth-password" className="block text-xs">
                        Senha
                    </label>

                    <div className="relative">
                        <Input
                            id="auth-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={registering ? 'new-password' : 'current-password'}
                            required
                            minLength={registering ? 8 : 1}
                            maxLength={128}
                            disabled={authenticate.isPending}
                            aria-invalid={Boolean(responseError?.errors?.password)}
                            aria-describedby="password-error"
                            className="pr-12"
                        />

                        <button
                            type="button"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            aria-pressed={showPassword}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded text-muted-foreground"
                            onClick={() => setShowPassword((visible) => !visible)}
                        >
                            {showPassword
                                ? <EyeOff size={16} />
                                : <Eye size={16} />}
                        </button>
                    </div>

                    <p id="password-error" className="text-xs">
                        {responseError?.errors?.password?.[0]}
                    </p>

                    {registering && (
                        <label className="block text-xs">
                            Confirmar senha
                            <Input
                                name="confirmation"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                minLength={8}
                                maxLength={128}
                                disabled={authenticate.isPending}
                                aria-invalid={Boolean(confirmationError)}
                                aria-describedby="confirmation-error"
                                className="mt-2"
                            />
                            <span id="confirmation-error" className="mt-1 block">
                                {confirmationError}
                            </span>
                        </label>
                    )}

                    {authenticate.isError && (
                        <p role="alert" className="text-sm">
                            {responseError?.message
                                ?? 'Não foi possível acessar a conta. Tente novamente.'}
                        </p>
                    )}

                    {confirmationError && (
                        <p role="alert" className="text-xs">
                            Confira a confirmação de senha.
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={authenticate.isPending}
                        className="w-full"
                    >
                        {authenticate.isPending
                            ? 'Aguarde...'
                            : registering
                                ? 'Criar perfil'
                                : 'Entrar'}
                    </Button>
                </form>

                <div className="mt-8 border-t border-border pt-5">
                    <p className="text-center text-xs text-muted-foreground">
                        Acesso com Google e Facebook indisponível nesta demonstração.
                    </p>
                </div>

                <p role="status" className="mt-4 text-center text-xs">
                    {authenticate.isPending ? 'Validando os dados...' : ''}
                </p>
            </dialog>
        </>
    )
}