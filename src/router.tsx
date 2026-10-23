import {
    createRootRoute,
    createRoute,
    createRouter,
    Link,
    Outlet,
} from '@tanstack/react-router'
import App from './App'

const rootRoute = createRootRoute({
    component: () => <Outlet />,
    notFoundComponent: () => (
        <main className="mx-auto max-w-6xl px-6 py-20">
            <h1 className="text-2xl font-bold">Página não encontrada</h1>
            <Link to="/" className="mt-6 inline-block underline">
                Voltar para o início
            </Link>
        </main>
    ),
})

const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: App,
})

const routeTree = rootRoute.addChildren([homeRoute])

export const router = createRouter({
    routeTree,
    scrollRestoration: true,
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}