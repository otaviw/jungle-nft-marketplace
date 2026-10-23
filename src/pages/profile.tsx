import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { sessionOptions } from '@/lib/session'
import type { Profile } from '@/types/profile'
import { AvatarForm } from '@/components/account/avatar-form'
import { PasswordForm } from '@/components/account/password-form'
import { Link } from '@tanstack/react-router'

const fields = [
    { name: 'displayName', label: 'Nome de exibição', required: true },
    { name: 'name', label: 'Nome de usuário', required: true },
    { name: 'email', label: 'E-mail', required: true },
    { name: 'ens', label: 'Nome ENS', required: false },
    { name: 'walletNickname', label: 'Apelido da carteira', required: false },
] as const

type ProfileInput = Pick<
    Profile,
    'displayName' | 'name' | 'email' | 'ens' | 'walletNickname'
>

interface ProfileError {
    message?: string
    errors?: Record<string, string[]>
}

export function ProfilePage() {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const userId = session.data?.user.id
    const profileKey = ['profile', userId]

    const profile = useQuery({
        queryKey: profileKey,
        enabled: Boolean(userId),
        queryFn: async ({ signal }) => {
            const response = await api.get<Profile>('/profile', { signal })

            return response.data
        },
    })

    const save = useMutation({
        mutationFn: async (input: ProfileInput) => {
            const response = await api.patch<Profile>('/profile', input)

            return response.data
        },
        onSuccess: async (updated) => {
            queryClient.setQueryData(profileKey, updated)

            await queryClient.invalidateQueries({
                queryKey: ['session'],
            })
        },
    })

    const error = axios.isAxiosError<ProfileError>(save.error)
        ? save.error.response?.data
        : undefined

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
                <div className="grid items-start gap-8 md:grid-cols-[220px_1fr]">
                    <aside className="rounded bg-card p-5">
                        <h2 className="font-bold">Meu perfil</h2>
                        <p className="mt-4 border-l-2 border-primary pl-3 text-sm text-primary">
                            Dados do perfil
                        </p>
                        <Link
                            to="/wallets"
                            className="mt-4 block text-sm text-muted-foreground hover:text-primary"
                        >
                            Carteiras
                        </Link>
                    </aside>

                    <section aria-labelledby="profile-title">
                        <h1 id="profile-title" className="text-lg font-bold">
                            Perfil do colecionador
                        </h1>

                        {profile.isPending && (
                            <div role="status" className="mt-6">
                                <span className="sr-only">Carregando perfil</span>
                                <div
                                    aria-hidden="true"
                                    className="catalog-shimmer h-72 rounded-xl"
                                />
                            </div>
                        )}

                        {profile.isError && (
                            <div role="alert" className="mt-6">
                                <p>Não foi possível carregar o perfil.</p>
                                <Button
                                    className="mt-4"
                                    onClick={() => void profile.refetch()}
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        )}

                        {profile.data && (
                            <form
                                key={profile.data.id}
                                className="mt-8"
                                onSubmit={(event) => {
                                    event.preventDefault()

                                    const form = new FormData(event.currentTarget)

                                    save.mutate({
                                        displayName: String(form.get('displayName') ?? ''),
                                        name: String(form.get('name') ?? ''),
                                        email: String(form.get('email') ?? ''),
                                        ens: String(form.get('ens') ?? ''),
                                        walletNickname: String(form.get('walletNickname') ?? ''),
                                    })
                                }}
                            >
                                <div className="grid gap-6 sm:grid-cols-2">
                                    {fields.map((field) => (
                                        <label key={field.name} className="block text-sm">
                                            <span id={`profile-${field.name}-label`}>
                                                {field.label}
                                            </span>
                                            {field.required && (
                                                <span aria-hidden="true" className="text-primary">
                                                    *
                                                </span>
                                            )}

                                            <Input
                                                name={field.name}
                                                type={field.name === 'email' ? 'email' : 'text'}
                                                autoComplete={
                                                    field.name === 'email'
                                                        ? 'email'
                                                        : field.name === 'name'
                                                            ? 'nickname'
                                                            : undefined
                                                }
                                                required={field.required}
                                                minLength={field.required && field.name !== 'email'
                                                    ? 2
                                                    : undefined}
                                                maxLength={field.name === 'email' ? 254 : 100}
                                                defaultValue={profile.data?.[field.name] ?? ''}
                                                disabled={save.isPending}
                                                aria-invalid={Boolean(error?.errors?.[field.name])}
                                                aria-describedby={`profile-${field.name}-error`}
                                                className="mt-2"
                                            />

                                            <span
                                                id={`profile-${field.name}-error`}
                                                className="mt-1 block text-xs"
                                            >
                                                {error?.errors?.[field.name]?.[0]}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                {save.isError && (
                                    <p role="alert" className="mt-5 text-sm">
                                        {error?.message ?? 'Não foi possível salvar o perfil.'}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    className="mt-8"
                                    disabled={save.isPending}
                                >
                                    {save.isPending ? 'Salvando...' : 'Salvar'}
                                </Button>

                                <p role="status" className="mt-4 text-sm">
                                    {save.isSuccess ? 'Perfil atualizado.' : ''}
                                </p>
                            </form>
                        )}

                        {profile.data && (
                            <>
                                <AvatarForm profile={profile.data} />
                                <PasswordForm />
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    )
}