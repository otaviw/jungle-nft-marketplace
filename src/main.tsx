import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { router } from './router'
import './index.css'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { seedAuth } = await import('./mocks/auth-store')
    const { worker } = await import('./mocks/browser')
    const { restoreInventory } = await import('./mocks/order-store')

    await seedAuth()
    restoreInventory()
    
    await worker.start({
      onUnhandledFrame: 'bypass',
    })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap().catch((error: unknown) => {
  console.error('Não foi possível iniciar a aplicação.', error)

  const root = document.getElementById('root')

  if (root) {
    root.textContent = 'Não foi possível iniciar. Recarregue a página.'
  }
})