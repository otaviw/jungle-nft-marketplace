import {
    createRootRoute,
    createRoute,
    createRouter,
    defaultParseSearch,
    Link,
} from '@tanstack/react-router'
import App from './App'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { NftDetailPage } from '@/pages/nft-detail'
import { CartPage } from '@/pages/cart'
import { AuthPage } from '@/pages/auth'
import { ProfilePage } from '@/pages/profile'
import { requireSession } from '@/lib/require-session'
import { WalletsPage } from '@/pages/wallets'
import { OrderPage } from '@/pages/order'
import { CheckoutPage } from '@/pages/checkout'
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
    component: App,
})

const nftDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/nfts/$nftId',
    component: NftDetailPage,
})

const cartRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cart',
    component: CartPage,
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
    component: AuthPage,
})

const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile',
    beforeLoad: () => requireSession('/profile'),
    component: ProfilePage,
})

const walletsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/wallets',
    beforeLoad: () => requireSession('/wallets'),
    component: WalletsPage,
})

const orderRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/orders/$orderId',
    beforeLoad: ({ params }) =>
        requireSession(`/orders/${params.orderId}`),
    component: OrderPage,
})

const checkoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/checkout',
    beforeLoad: () => requireSession('/checkout'),
    component: CheckoutPage,
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
