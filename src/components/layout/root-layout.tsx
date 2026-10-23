import { Outlet } from '@tanstack/react-router'
import { CatalogRealtime } from './catalog-realtime'
import { SessionMonitor } from './session-monitor'

export function RootLayout() {
    return (
        <>
            <SessionMonitor />
            <CatalogRealtime />
            <Outlet />
        </>
    )
}