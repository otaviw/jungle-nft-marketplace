import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import {
    walletNetworks,
    walletProviders,
    type Wallet,
    type WalletInput,
    type WalletSlot,
} from '@/lib/wallet-schema'

const fields = [
    { name: 'name', label: 'Nome de exibição', required: true },
    { name: 'nickname', label: 'Apelido da carteira', required: true },
    { name: 'profileName', label: 'Nome do perfil', required: true },
    { name: 'address', label: 'Endereço da carteira', required: true },
    { name: 'email', label: 'E-mail', required: true },
    { name: 'ens', label: 'Nome ENS (opcional)', required: false },
    { name: 'referralCode', label: 'Código de indicação (opcional)', required: false },
] as const

interface WalletError {
    message?: string
    errors?: Record<string, string[]>
}

interface Props {
    slot: WalletSlot
    wallet?: Wallet
    userId: string
}

export function WalletForm({ slot, wallet, userId }: Props) {
    const queryClient = useQueryClient()
    const title = slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'

    const save = useMutation({
        mutationFn: async (input: WalletInput) => {
            const response = await api.put<Wallet>(`/wallets/${slot}`, input)

            return response.data
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['wallets', userId],
            })
        },
    })

    const error = axios.isAxiosError<WalletError>(save.error)
        ? save.error.response?.data
        : undefined

    return (
        <section aria-labelledby={`wallet-title-${slot}`}>
            <h2 id={`wallet-title-${slot}`} className="font-bold">
                {title}
            </h2>

            <p className="mt-2 text-xs text-muted-foreground">
                {wallet
                    ? 'Edite os dados da carteira cadastrada.'
                    : 'Cadastre uma carteira para utilizar no pagamento simulado.'}
            </p>

            <form
                className="mt-6"
                onSubmit={(event) => {
                    event.preventDefault()

                    const form = new FormData(event.currentTarget)

                    // Os valores são validados novamente pela API.
                    save.mutate({
                        name: String(form.get('name') ?? ''),
                        nickname: String(form.get('nickname') ?? ''),
                        profileName: String(form.get('profileName') ?? ''),
                        address: String(form.get('address') ?? ''),
                        email: String(form.get('email') ?? ''),
                        ens: String(form.get('ens') ?? ''),
                        referralCode: String(form.get('referralCode') ?? ''),
                        network: form.get('network') as WalletInput['network'],
                        provider: form.get('provider') as WalletInput['provider'],
                    })
                }}
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    {fields.map((field) => (
                        <label key={field.name} className="block text-sm">
                            {field.label}

                            <Input
                                name={field.name}
                                type={field.name === 'email' ? 'email' : 'text'}
                                required={field.required}
                                maxLength={field.name === 'email' ? 254 : 100}
                                defaultValue={wallet?.[field.name] ?? ''}
                                disabled={save.isPending}
                                aria-invalid={Boolean(error?.errors?.[field.name])}
                                aria-describedby={`${slot}-${field.name}-error`}
                                className="mt-2"
                            />

                            <span
                                id={`${slot}-${field.name}-error`}
                                className="mt-1 block text-xs"
                            >
                                {error?.errors?.[field.name]?.[0]}
                            </span>
                        </label>
                    ))}

                    <label className="block text-sm">
                        Rede

                        <select
                            name="network"
                            defaultValue={wallet?.network ?? ''}
                            required
                            disabled={save.isPending}
                            aria-invalid={Boolean(error?.errors?.network)}
                            aria-describedby={`${slot}-network-error`}
                            className="mt-2 w-full rounded-md border border-input bg-background p-3"
                        >
                            <option value="" disabled>Selecione uma rede</option>
                            {walletNetworks.map((network) => (
                                <option key={network} value={network}>{network}</option>
                            ))}
                        </select>

                        <span id={`${slot}-network-error`} className="text-xs">
                            {error?.errors?.network?.[0]}
                        </span>
                    </label>

                    <label className="block text-sm">
                        Tipo de carteira

                        <select
                            name="provider"
                            defaultValue={wallet?.provider ?? ''}
                            required
                            disabled={save.isPending}
                            aria-invalid={Boolean(error?.errors?.provider)}
                            aria-describedby={`${slot}-provider-error`}
                            className="mt-2 w-full rounded-md border border-input bg-background p-3"
                        >
                            <option value="" disabled>Selecione uma carteira</option>
                            {walletProviders.map((provider) => (
                                <option key={provider} value={provider}>{provider}</option>
                            ))}
                        </select>

                        <span id={`${slot}-provider-error`} className="text-xs">
                            {error?.errors?.provider?.[0]}
                        </span>
                    </label>
                </div>

                {save.isError && (
                    <p role="alert" className="mt-5 text-sm">
                        {error?.message ?? 'Não foi possível salvar a carteira.'}
                    </p>
                )}

                <Button type="submit" disabled={save.isPending} className="mt-6">
                    {save.isPending ? 'Salvando...' : 'Salvar carteira'}
                </Button>

                <p role="status" className="mt-3 text-sm">
                    {save.isSuccess ? 'Carteira salva.' : ''}
                </p>
            </form>
        </section>
    )
}