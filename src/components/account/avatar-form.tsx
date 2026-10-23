import { useRef } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Profile } from '@/types/profile'

export function AvatarForm({ profile }: { profile: Profile }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()

    const update = useMutation({
        mutationFn: async (file: File | null) => {
            if (!file) {
                const response = await api.delete<Profile>('/profile/avatar')
                return response.data
            }

            const form = new FormData()
            form.append('avatar', file)

            const response = await api.post<Profile>('/profile/avatar', form)

            return response.data
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(['profile', profile.id], updated)
        },
    })

    const message = axios.isAxiosError<{ message?: string }>(update.error)
        ? update.error.response?.data?.message ?? 'Não foi possível alterar o avatar.'
        : 'Não foi possível alterar o avatar.'

    return (
        <section aria-labelledby="avatar-title" className="mt-8">
            <h2 id="avatar-title" className="text-sm">Avatar</h2>

            <div className="mt-3 flex flex-wrap items-center gap-4">
                {profile.avatar ? (
                    <img
                        src={profile.avatar}
                        alt={`Avatar de ${profile.displayName}`}
                        width={64}
                        height={64}
                        className="size-16 rounded-full object-cover"
                    />
                ) : (
                    <div
                        aria-label="Sem avatar"
                        className="flex size-16 items-center justify-center rounded-full bg-card text-xl text-primary"
                    >
                        {profile.displayName.slice(0, 1).toUpperCase()}
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Selecionar avatar"
                    disabled={update.isPending}
                    hidden
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0]

                        if (file) {
                            update.mutate(file)
                        }

                        event.currentTarget.value = ''
                    }}
                />

                <Button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => inputRef.current?.click()}
                >
                    Alterar
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    disabled={!profile.avatar || update.isPending}
                    onClick={() => update.mutate(null)}
                >
                    Remover
                </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
                PNG, JPG ou WebP. Máximo de 2 MB.
            </p>

            {update.isError && (
                <p role="alert" className="mt-3 text-sm">{message}</p>
            )}

            <p role="status" className="mt-3 text-sm">
                {update.isPending
                    ? 'Salvando avatar...'
                    : update.isSuccess
                        ? 'Avatar atualizado.'
                        : ''}
            </p>
        </section>
    )
}