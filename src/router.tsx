import {
    createRootRoute,
    createRoute,
    createRouter,
    defaultParseSearch,
    Link,
    lazyRouteComponent,
} from '@tanstack/react-router'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { requireSession } from '@/lib/require-session'
import { RootLayout } from '@/components/layout/root-layout'

const rootRoute = createRootRoute({
    component: RootLayout,
    notFoundComponent: () => (
        <main className="mx-auto max-w-6xl px-6 py-20">
            <h1 className="text-2xl font-bold">Página não encontrada</h1>
            <Link to="/" search={parseCatalogSearch({})} className="mt-6 inline-block underline">
                Voltar para o início
            </Link>
        </main>
    ),
})

const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: parseCatalogSearch,
    component: lazyRouteComponent(() => import('./App')),
})

const nftDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/nfts/$nftId',
    component: lazyRouteComponent(() => import('@/pages/nft-detail'), 'NftDetailPage'),
})

const cartRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cart',
    component: lazyRouteComponent(() => import('@/pages/cart'), 'CartPage'),
})

const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    validateSearch: (search: Record<string, unknown>) => {
        const mode: 'login' | 'register' = search.mode === 'register'
            ? 'register'
            : 'login'

        const allowedRedirects = ['/', '/cart', '/checkout', '/profile', '/wallets', '/?favorites=true#catalogo']

        const requestedRedirect = typeof search.redirect === 'string'
            ? search.redirect
            : '/'

        const isOrderPage =
            /^\/orders\/[a-zA-Z0-9-]+$/.test(requestedRedirect)

        const isNftPage =
            /^\/nfts\/[a-zA-Z0-9-]+$/.test(requestedRedirect)

        const redirect =
            allowedRedirects.includes(requestedRedirect) || isOrderPage || isNftPage
                ? requestedRedirect
                : '/'
        return { mode, redirect }
    },
    component: lazyRouteComponent(() => import('@/pages/auth'), 'AuthPage'),
})

const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile',
    beforeLoad: () => requireSession('/profile'),
    component: lazyRouteComponent(() => import('@/pages/profile'), 'ProfilePage'),
})

const walletsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/wallets',
    beforeLoad: () => requireSession('/wallets'),
    component: lazyRouteComponent(() => import('@/pages/wallets'), 'WalletsPage'),
})

const orderRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/orders/$orderId',
    beforeLoad: ({ params }) =>
        requireSession(`/orders/${params.orderId}`),
    component: lazyRouteComponent(() => import('@/pages/order'), 'OrderPage'),
})

const checkoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/checkout',
    beforeLoad: () => requireSession('/checkout'),
    component: lazyRouteComponent(() => import('@/pages/checkout'), 'CheckoutPage'),
})

const routeTree = rootRoute.addChildren([
    homeRoute,
    nftDetailRoute,
    cartRoute,
    authRoute,
    profileRoute,
    walletsRoute,
    orderRoute,
    checkoutRoute,
])

export const router = createRouter({
    routeTree,
    parseSearch: query => {
        const search: Record<string, unknown> = defaultParseSearch(query)
        const params = new URLSearchParams(query)
        // Numeric JSON parsing would round prices before wei validation.
        for (const key of ['minPrice', 'maxPrice']) {
            const raw = params.get(key)
            if (raw !== null && !raw.startsWith('"')) search[key] = raw
        }
        return search
    },
    scrollRestoration: true,
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
