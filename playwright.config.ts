import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 60_000,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,

    expect: {
        timeout: 10_000,
    },

    reporter: [
        ['list'],
        ['html', { open: 'never' }],
    ],

    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium',
        serviceWorkers: 'allow',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'desktop',
            use: {
                viewport: { width: 1440, height: 900 },
            },
        },
        {
            name: 'mobile',
            use: {
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 1,
            },
        },
    ],

    webServer: {
        command:
            'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            VITE_ENABLE_MOCKS: 'true',
        },
    },
})