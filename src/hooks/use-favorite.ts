import {
    useIsMutating,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getAuthToken } from '@/lib/auth-token'
import { sessionOptions } from '@/lib/session'
import type { Favorites } from '@/types/favorites'

export function useFavorite(nftId: string) {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)

    const userId = session.data?.user.id
    const token = session.data?.token
    const favoritesKey = ['favorites', userId]
    const mutationKey = ['favorites', userId, nftId]

    const favorites = useQuery({
        queryKey: favoritesKey,
        enabled: Boolean(userId),
        queryFn: async ({ signal }) => {
            const response = await api.get<Favorites>('/favorites', { signal })

            return response.data
        },
    })

    const pendingCount = useIsMutating({
        mutationKey,
        exact: true,
    })

    const mutation = useMutation({
        mutationKey,
        mutationFn: async (favorite: boolean) => {
            if (!token || getAuthToken() !== token) {
                throw new Error('A sessão mudou. Tente novamente.')
            }

            const path = `/favorites/${encodeURIComponent(nftId)}`

            if (favorite) {
                await api.put(path)
            } else {
                await api.delete(path)
            }
        },
        onMutate: async (favorite) => {
            await queryClient.cancelQueries({
                queryKey: favoritesKey,
            })

            if (!token || getAuthToken() !== token) {
                throw new Error('A sessão mudou.')
            }

            const previous = queryClient.getQueryData<Favorites>(favoritesKey)
            const wasFavorite = previous?.nftIds.includes(nftId) ?? false

            queryClient.setQueryData<Favorites>(favoritesKey, (current) => {
                const ids = new Set(current?.nftIds ?? [])

                if (favorite) {
                    ids.add(nftId)
                } else {
                    ids.delete(nftId)
                }

                return { nftIds: [...ids] }
            })

            return { wasFavorite }
        },
        onError: (_error, _favorite, context) => {
            if (!context || !token || getAuthToken() !== token) {
                return
            }

            // Restaura só este NFT, preservando alterações de outros favoritos.
            queryClient.setQueryData<Favorites>(favoritesKey, (current) => {
                const ids = new Set(current?.nftIds ?? [])

                if (context.wasFavorite) {
                    ids.add(nftId)
                } else {
                    ids.delete(nftId)
                }

                return { nftIds: [...ids] }
            })

            void queryClient.invalidateQueries({ queryKey: ['session'] })
        },
        onSettled: () => {
            if (!token || getAuthToken() !== token) {
                return
            }

            // Aguarda a última mutation para não sobrescrever outros
            // favoritos que ainda estão sendo atualizados otimisticamente.
            if (
                queryClient.isMutating({
                    mutationKey: ['favorites', userId],
                }) === 1
            ) {
                return queryClient.invalidateQueries({
                    queryKey: favoritesKey,
                })
            }
        },
    })

    return {
        authenticated: Boolean(userId),
        favorite: favorites.data?.nftIds.includes(nftId) ?? false,
        loading: session.isPending || Boolean(userId && favorites.isPending),
        loadError: session.isError || favorites.isError,
        pending: pendingCount > 0,
        mutation,
        retry: () => {
            if (session.isError) {
                void session.refetch()
            } else {
                void favorites.refetch()
            }
        },
    }
}