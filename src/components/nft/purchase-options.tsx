import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { Cart, CartItem } from '@/types/cart'
import type { Nft } from '@/types/nft'
import { Link } from '@tanstack/react-router'

import { sessionOptions } from '@/lib/session'
export function PurchaseOptions({ nft }: { nft: Nft }) {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const cartKey = ['cart', session.data?.user.id ?? 'guest']

    const [editionId, setEditionId] = useState(
        () => nft.editions.find((edition) => edition.available > 0)?.id
            ?? nft.editions[0]?.id
            ?? '',
    )

    const [quantity, setQuantity] = useState('1')

    const edition = nft.editions.find((item) => item.id === editionId)
    const units = Number(quantity)

    const validQuantity = Number.isSafeInteger(units)
        && units >= 1
        && units <= (edition?.available ?? 0)

    const addItem = useMutation({
        mutationFn: async (item: CartItem) => {
            const response = await api.post<Cart>('/cart/items', item)

            return response.data
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: cartKey,
            })
        },
    })

    const errorMessage = axios.isAxiosError<{ message?: string }>(addItem.error)
        ? addItem.error.response?.data?.message
        ?? 'Não foi possível adicionar. Tente novamente.'
        : 'Não foi possível adicionar. Tente novamente.'

    return (
        <form
            className="mt-8 space-y-5 border-t border-border pt-6"
            onSubmit={(event) => {
                event.preventDefault()

                if (
                    !validQuantity
                    || !edition
                    || addItem.isPending
                    || !session.isSuccess
                ) {
                    return
                }

                addItem.mutate({
                    nftId: nft.id,
                    editionId: edition.id,
                    quantity: units,
                })
            }}
        >
            <label className="block text-sm">
                <span id="nft-edition-label">Edição</span>

                <select
                    aria-labelledby="nft-edition-label"
                    value={editionId}
                    disabled={addItem.isPending}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3"
                    onChange={(event) => {
                        setEditionId(event.target.value)
                        setQuantity('1')
                        addItem.reset()
                    }}
                >
                    {nft.editions.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                            {item.available === 0 ? ' — Esgotada' : ''}
                        </option>
                    ))}
                </select>
            </label>

            {edition && (
                <>
                    <p className="text-xl font-bold text-primary">
                        {edition.price} ETH
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            por unidade
                        </span>
                    </p>

                    <p className="text-sm text-muted-foreground">
                        {edition.available > 0
                            ? `${edition.available} unidades disponíveis`
                            : 'Esta edição está esgotada.'}
                    </p>

                    <label className="block text-sm">
                        Quantidade

                        <Input
                            type="number"
                            min={1}
                            max={edition.available || 1}
                            step={1}
                            value={quantity}
                            disabled={edition.available === 0 || addItem.isPending}
                            aria-invalid={!validQuantity && edition.available > 0}
                            aria-describedby="quantity-help"
                            className="mt-2 max-w-32"
                            onChange={(event) => {
                                setQuantity(event.target.value)
                                addItem.reset()
                            }}
                        />
                    </label>

                    <p id="quantity-help" className="text-xs text-muted-foreground">
                        Selecione uma quantidade inteira dentro da disponibilidade.
                        O limite inclui unidades já adicionadas ao carrinho.
                    </p>
                </>
            )}

            <Button
                type="submit"
                className="w-full"
                disabled={
                    !validQuantity
                    || addItem.isPending
                    || !session.isSuccess
                }
            >
                {addItem.isPending ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </Button>

            <Link
                to="/cart"
                className="block text-center text-sm text-primary underline"
            >
                Ver carrinho
            </Link>

            {addItem.isSuccess && (
                <p role="status" className="text-sm">
                    Item adicionado ao carrinho.
                </p>
            )}

            {addItem.isError && (
                <p role="alert" className="text-sm">
                    {errorMessage}
                </p>
            )}
        </form>
    )
}