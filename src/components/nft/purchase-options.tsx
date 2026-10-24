import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { Cart, CartItem } from '@/types/cart'
import type { Nft } from '@/types/nft'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { FavoriteButton } from './favorite-button'

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
            className="purchase-options"
            data-added={addItem.isSuccess}
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
            <fieldset className="edition-selector" disabled={addItem.isPending}>
                <legend>Edição:</legend>
                <div className="edition-chips">{nft.editions.map(item => <label key={item.id} data-selected={editionId === item.id} data-unavailable={item.available === 0}><input type="radio" name="edition" value={item.id} aria-label={item.name} checked={editionId === item.id} disabled={item.available === 0} onChange={() => { setEditionId(item.id); setQuantity('1'); addItem.reset() }} /><span>{item.name === 'Edição padrão' ? 'Padrão' : 'Limitada'}</span>{item.available === 0 && <small> · Esgotada</small>}</label>)}</div>
            </fieldset>

            {edition && (
                <>
                    <p className="purchase-unit-price">
                        {edition.price} ETH
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            por unidade
                        </span>
                    </p>

                    <p id="edition-availability" className="purchase-availability" data-unavailable={edition.available === 0}>
                        {edition.available > 0
                            ? `${edition.available} unidades disponíveis`
                            : 'Esta edição está esgotada.'}
                    </p>

                    <div className="quantity-row"><label htmlFor="nft-quantity" className="quantity-label"><span id="nft-quantity-label" className="sr-only">Quantidade</span><span aria-hidden="true">Qtd.</span></label>
                    <div className="quantity-stepper">
                        <button type="button" aria-label="Diminuir quantidade" disabled={units <= 1 || addItem.isPending || edition.available === 0} onClick={() => { setQuantity(String(Math.max(1, units - 1))); addItem.reset() }}><Minus size={18} aria-hidden="true" /></button>

                        <Input
                            id="nft-quantity"
                            aria-labelledby="nft-quantity-label"
                            type="number"
                            min={1}
                            max={edition.available || 1}
                            step={1}
                            value={quantity}
                            disabled={edition.available === 0 || addItem.isPending}
                            aria-invalid={!validQuantity && edition.available > 0}
                            aria-describedby="quantity-help edition-availability"
                            className="quantity-input"
                            onChange={(event) => {
                                setQuantity(event.target.value)
                                addItem.reset()
                            }}
                        />
                        <button type="button" aria-label="Aumentar quantidade" disabled={!validQuantity || units >= edition.available || addItem.isPending} onClick={() => { setQuantity(String(units + 1)); addItem.reset() }}><Plus size={18} aria-hidden="true" /></button>
                    </div></div>

                    <p id="quantity-help" className="quantity-help sr-only">
                        Selecione uma quantidade inteira dentro da disponibilidade.
                        O limite inclui unidades já adicionadas ao carrinho.
                    </p>
                </>
            )}

            <Button
                type="submit"
                aria-label={addItem.isPending ? 'Adicionando ao carrinho' : 'Comprar NFT — adicionar ao carrinho'}
                aria-busy={addItem.isPending}
                className="purchase-submit"
                disabled={
                    !validQuantity
                    || addItem.isPending
                    || !session.isSuccess
                }
            >
                <span className="purchase-label"><span className="purchase-label-desktop">{addItem.isPending ? 'Adicionando...' : 'Comprar'}</span><span className="purchase-label-mobile">{addItem.isPending ? 'Adicionando...' : 'Comprar NFT'}</span></span>
                <ShoppingCart size={20} aria-hidden="true" />
            </Button>
            <div className="purchase-favorite"><FavoriteButton nftId={nft.id} text /></div>

            <Link
                to="/cart"
                className="block text-center text-sm text-primary underline"
            >
                <ShoppingCart size={22} aria-hidden="true" /><span>Ver carrinho</span>
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
