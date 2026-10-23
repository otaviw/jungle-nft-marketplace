import { expect, type Page } from '@playwright/test'

export async function login(
    page: Page,
    email = 'demo@kurio.test',
    redirect = '/',
) {
    await page.goto(
        `/login?mode=login&redirect=${encodeURIComponent(redirect)}`,
    )

    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()

    await dialog.getByLabel('E-mail', { exact: true }).fill(email)
    await dialog.getByLabel('Senha', { exact: true }).fill('Kurio123!')
    await dialog
        .locator('form')
        .getByRole('button', { name: 'Entrar', exact: true })
        .click()

    await expect(page).not.toHaveURL(/\/login/)
}

export async function addNft(page: Page, id = 'nft-001') {
    await page.goto(`/nfts/${id}`)

    await expect(
        page.getByRole('heading', { level: 1 }),
    ).toBeVisible()

    await page.getByLabel('Edição', { exact: true }).selectOption('standard')

    await page.getByRole('button', {
        name: 'Adicionar ao carrinho',
        exact: true,
    }).click()

    await expect(
        page.getByText('Item adicionado ao carrinho.', { exact: true }),
    ).toBeVisible()
}

export async function registerWallet(page: Page) {
    await page.goto('/wallets')

    const primary = page.getByRole('region', {
        name: 'Carteira principal',
        exact: true,
    })

    await primary.getByLabel('Nome de exibição', { exact: true })
        .fill('Carteira de teste')

    await primary.getByLabel('Apelido da carteira', { exact: true })
        .fill('Principal de teste')

    await primary.getByLabel('Nome do perfil', { exact: true })
        .fill('Colecionador Demo')

    await primary.getByLabel('Endereço da carteira', { exact: true })
        .fill('0x1111111111111111111111111111111111111111')

    await primary.getByLabel('E-mail', { exact: true })
        .fill('demo@kurio.test')

    await primary.getByLabel('Rede', { exact: true })
        .selectOption('Ethereum')

    await primary.getByLabel('Tipo de carteira', { exact: true })
        .selectOption('MetaMask')

    await primary.getByRole('button', {
        name: 'Salvar carteira',
        exact: true,
    }).click()

    await expect(primary.getByRole('status')).toHaveText('Carteira salva.')
}

export async function reviewCheckout(page: Page) {
    await page.goto('/checkout')

    await page.getByRole('radio', {
        name: /Principal de teste/,
    }).check()

    await page.getByRole('button', {
        name: 'Conectar carteira',
        exact: true,
    }).click()

    await expect(
        page.getByText('Carteira conectada na simulação', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', {
        name: 'Revisar compra',
        exact: true,
    }).click()

    await expect(
        page.getByRole('button', { name: 'Confirmar compra', exact: true }),
    ).toBeVisible()
}