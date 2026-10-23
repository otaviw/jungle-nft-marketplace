import axios from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavorite } from '@/hooks/use-favorite'

export function FavoriteButton({ nftId }: { nftId: string }) {
    const navigate = useNavigate()
    const state = useFavorite(nftId)

    const errorMessage = axios.isAxiosError<{ message?: string }>(
        state.mutation.error,
    )
        ? state.mutation.error.response?.data?.message
        ?? 'Não foi possível salvar o favorito.'
        : 'Não foi possível salvar o favorito.'

    return (
        <div>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full bg-background/90"
                aria-label={
                    state.loadError
                        ? 'Tentar carregar favoritos novamente'
                        : state.favorite
                            ? 'Remover dos favoritos'
                            : 'Adicionar aos favoritos'
                }
                aria-pressed={state.favorite}
                disabled={state.loading || state.pending}
                onClick={() => {
                    if (state.loadError) {
                        state.retry()
                        return
                    }

                    if (!state.authenticated) {
                        void navigate({
                            to: '/login',
                            search: {
                                mode: 'login',
                                redirect: `/nfts/${nftId}`,
                            },
                        })
                        return
                    }

                    state.mutation.mutate(!state.favorite)
                }}
            >
                <Heart
                    size={18}
                    aria-hidden="true"
                    className={state.favorite ? 'fill-primary text-primary' : ''}
                />
            </Button>

            {state.mutation.isError && (
                <p
                    role="alert"
                    className="mt-2 max-w-48 rounded bg-card p-2 text-xs"
                >
                    {errorMessage}
                </p>
            )}

            {state.loadError && (
                <p role="alert" className="mt-2 text-xs">
                    Favoritos indisponíveis. Clique para tentar novamente.
                </p>
            )}

            <span role="status" className="sr-only">
                {state.pending
                    ? 'Salvando favorito'
                    : state.mutation.isSuccess
                        ? 'Favorito atualizado'
                        : ''}
            </span>
        </div>
    )
}