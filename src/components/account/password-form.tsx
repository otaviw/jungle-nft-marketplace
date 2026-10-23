import { useRef, useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

const fields = [
    { name: 'currentPassword', label: 'Senha atual' },
    { name: 'newPassword', label: 'Nova senha' },
    { name: 'confirmation', label: 'Confirmar nova senha' },
] as const

interface PasswordInput {
    currentPassword: string
    newPassword: string
    confirmation: string
}

interface PasswordError {
    message?: string
    errors?: Record<string, string[]>
}

export function PasswordForm() {
    const formRef = useRef<HTMLFormElement>(null)
    const [visible, setVisible] = useState(false)

    const change = useMutation({
        mutationFn: async (input: PasswordInput) => {
            await api.post('/profile/password', input)
        },
        onSuccess: () => {
            formRef.current?.reset()
            setVisible(false)
        },
    })

    const error = axios.isAxiosError<PasswordError>(change.error)
        ? change.error.response?.data
        : undefined

    return (
        <section
            aria-labelledby="password-title"
            className="mt-10 border-t border-border pt-8"
        >
            <h2 id="password-title" className="font-bold">
                Alterar senha
            </h2>

            <form
                ref={formRef}
                className="mt-5 max-w-md space-y-5"
                onSubmit={(event) => {
                    event.preventDefault()

                    const form = new FormData(event.currentTarget)

                    change.mutate({
                        currentPassword: String(form.get('currentPassword') ?? ''),
                        newPassword: String(form.get('newPassword') ?? ''),
                        confirmation: String(form.get('confirmation') ?? ''),
                    })
                }}
            >
                {fields.map((field) => (
                    <label key={field.name} className="block text-sm">
                        {field.label}

                        <Input
                            name={field.name}
                            type={visible ? 'text' : 'password'}
                            autoComplete={
                                field.name === 'currentPassword'
                                    ? 'current-password'
                                    : 'new-password'
                            }
                            required
                            minLength={field.name === 'currentPassword' ? 1 : 8}
                            maxLength={128}
                            disabled={change.isPending}
                            aria-invalid={Boolean(error?.errors?.[field.name])}
                            aria-describedby={`password-${field.name}-error`}
                            className="mt-2"
                        />

                        <span
                            id={`password-${field.name}-error`}
                            className="mt-1 block text-xs"
                        >
                            {error?.errors?.[field.name]?.[0]}
                        </span>
                    </label>
                ))}

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={visible}
                        onChange={(event) => setVisible(event.target.checked)}
                    />
                    Mostrar senhas
                </label>

                {change.isError && (
                    <p role="alert" className="text-sm">
                        {error?.message ?? 'Não foi possível alterar a senha.'}
                    </p>
                )}

                <Button type="submit" disabled={change.isPending}>
                    {change.isPending ? 'Alterando...' : 'Alterar senha'}
                </Button>

                <p role="status" className="text-sm">
                    {change.isSuccess ? 'Senha alterada com sucesso.' : ''}
                </p>
            </form>
        </section>
    )
}