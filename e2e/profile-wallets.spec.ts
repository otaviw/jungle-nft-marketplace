import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'
import { login, registerWallet } from './helpers'

test('perfil atualizado permanece após refresh', async ({ page }) => {
    await login(page, 'demo@kurio.test', '/profile')

    const profile = page.getByRole('region', {
        name: 'Perfil do colecionador',
        exact: true,
    })

    await profile.getByLabel('Nome de exibição', { exact: true })
        .fill('Colecionador atualizado')

    await profile.getByLabel('Nome de usuário', { exact: true })
        .fill('Usuario Atualizado')

    await profile.getByLabel('Nome ENS', { exact: true })
        .fill('colecionador.eth')

    await profile.getByLabel('Apelido da carteira', { exact: true })
        .fill('Minha principal')

    await profile.getByRole('button', {
        name: 'Salvar',
        exact: true,
    }).click()

    await expect(profile.getByText(
        'Perfil atualizado.',
        { exact: true },
    )).toBeVisible()

    await page.reload()

    await expect(
        profile.getByLabel('Nome de exibição', { exact: true }),
    ).toHaveValue('Colecionador atualizado')

    await expect(
        profile.getByLabel('Nome de usuário', { exact: true }),
    ).toHaveValue('Usuario Atualizado')

    await expect(
        profile.getByLabel('Nome ENS', { exact: true }),
    ).toHaveValue('colecionador.eth')

    await expect(
        profile.getByLabel('Apelido da carteira', { exact: true }),
    ).toHaveValue('Minha principal')

    await expect(
        profile.getByLabel('E-mail', { exact: true }),
    ).toHaveValue('demo@kurio.test')
})

test('perfil rejeita ENS inválido e e-mail de outra conta', async ({
    page,
}) => {
    await login(page, 'demo@kurio.test', '/profile')

    const profile = page.getByRole('region', {
        name: 'Perfil do colecionador',
        exact: true,
    })

    const ens = profile.getByLabel('Nome ENS', { exact: true })
    const email = profile.getByLabel('E-mail', { exact: true })
    const save = profile.getByRole('button', {
        name: 'Salvar',
        exact: true,
    })

    await ens.fill('nome-invalido')
    await save.click()

    await expect(ens).toHaveAttribute('aria-invalid', 'true')

    await expect(profile.getByText(
        'Informe um nome terminado em .eth.',
        { exact: true },
    )).toBeVisible()

    await ens.fill('colecionador.eth')
    await email.fill('outro@kurio.test')
    await save.click()

    await expect(profile.getByRole('alert')).toHaveText(
        'Este e-mail já pertence a outra conta.',
    )

    await expect(email).toHaveAttribute('aria-invalid', 'true')

    // Nenhuma das tentativas inválidas deve ser persistida.
    await page.reload()

    await expect(email).toHaveValue('demo@kurio.test')
    await expect(ens).toHaveValue('')
})

test('troca de senha valida os campos e altera as credenciais', async ({
    page,
}) => {
    await login(page, 'demo@kurio.test', '/profile')

    const password = page.getByRole('region', {
        name: 'Alterar senha',
        exact: true,
    })

    const current = password.getByLabel('Senha atual', {
        exact: true,
    })
    const next = password.getByLabel('Nova senha', {
        exact: true,
    })
    const confirmation = password.getByLabel('Confirmar nova senha', {
        exact: true,
    })
    const submit = password.getByRole('button', {
        name: 'Alterar senha',
        exact: true,
    })

    await current.fill('SenhaErrada123!')
    await next.fill('NovaSenha456!')
    await confirmation.fill('NovaSenha456!')
    await submit.click()

    await expect(current).toHaveAttribute('aria-invalid', 'true')

    await expect(password.getByText(
        'Confira sua senha atual.',
        { exact: true },
    )).toBeVisible()

    await current.fill('Kurio123!')
    await confirmation.fill('OutraSenha789!')
    await submit.click()

    await expect(confirmation).toHaveAttribute('aria-invalid', 'true')

    await expect(password.getByText(
        'As senhas precisam ser iguais.',
        { exact: true },
    )).toBeVisible()

    await confirmation.fill('NovaSenha456!')
    await submit.click()

    await expect(password.getByText(
        'Senha alterada com sucesso.',
        { exact: true },
    )).toBeVisible()

    await expect(current).toHaveValue('')
    await expect(next).toHaveValue('')
    await expect(confirmation).toHaveValue('')

    await page.getByRole('button', {
        name: 'Sair',
        exact: true,
    }).click()

    await page.goto('/login?mode=login&redirect=%2Fprofile')

    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('E-mail', { exact: true })
        .fill('demo@kurio.test')

    const loginPassword = dialog.getByLabel('Senha', {
        exact: true,
    })
    const loginButton = dialog.locator('form').getByRole('button', {
        name: 'Entrar',
        exact: true,
    })

    // A senha anterior deixa de funcionar.
    await loginPassword.fill('Kurio123!')
    await loginButton.click()

    await expect(dialog.getByText(
        'E-mail ou senha incorretos.',
        { exact: true },
    )).toBeVisible()

    // A nova senha permite entrar.
    await loginPassword.fill('NovaSenha456!')
    await loginButton.click()

    await expect(page).toHaveURL(/\/profile$/)

    await expect(page.getByRole('heading', {
        name: 'Perfil do colecionador',
        exact: true,
    })).toBeVisible()
})

test('avatar rejeita arquivos inválidos, persiste e pode ser removido', async ({
    page,
}) => {
    await login(page, 'demo@kurio.test', '/profile')

    const avatar = page.getByRole('region', {
        name: 'Avatar',
        exact: true,
    })

    const fileInput = avatar.getByLabel('Selecionar avatar', {
        exact: true,
    })

    await fileInput.setInputFiles({
        name: 'arquivo.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Este arquivo não é uma imagem.'),
    })

    await expect(avatar.getByRole('alert')).toHaveText(
        'Envie uma imagem PNG, JPG ou WebP de até 2 MB.',
    )

    await expect(avatar.getByRole('img')).toHaveCount(0)

    await fileInput.setInputFiles({
        name: 'imagem-grande.png',
        mimeType: 'image/png',
        buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    })

    await expect(avatar.getByRole('alert')).toHaveText(
        'Envie uma imagem PNG, JPG ou WebP de até 2 MB.',
    )

    await expect(avatar.getByRole('img')).toHaveCount(0)

    // PNG de 1 pixel, sem depender de um arquivo no computador.
    const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
        + 'AAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=',
        'base64',
    )

    await fileInput.setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: png,
    })

    const image = avatar.getByRole('img')

    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/)

    // Confere que o navegador conseguiu carregar a imagem.
    await expect.poll(() =>
        image.evaluate((element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
    ).toBe(true)

    const savedSource = await image.getAttribute('src')

    await page.reload()

    await expect(image).toHaveAttribute('src', savedSource!)

    await avatar.getByRole('button', {
        name: 'Remover',
        exact: true,
    }).click()

    await expect(image).toHaveCount(0)

    await expect(avatar.getByRole('button', {
        name: 'Remover',
        exact: true,
    })).toBeDisabled()

    await page.reload()

    await expect(image).toHaveCount(0)
})

test('carteiras validam endereço e duplicidade e persistem edições', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)

    const primary = page.getByRole('region', {
        name: 'Carteira principal',
        exact: true,
    })

    const secondary = page.getByRole('region', {
        name: 'Carteira secundária',
        exact: true,
    })

    const primaryAddress = await primary.getByLabel(
        'Endereço da carteira',
        { exact: true },
    ).inputValue()

    await secondary.getByLabel('Nome de exibição', { exact: true })
        .fill('Carteira secundária de teste')

    await secondary.getByLabel('Apelido da carteira', { exact: true })
        .fill('Secundária')

    await secondary.getByLabel('Nome do perfil', { exact: true })
        .fill('Colecionador Demo')

    await secondary.getByLabel('E-mail', { exact: true })
        .fill('demo@kurio.test')

    await secondary.getByLabel('Rede', { exact: true })
        .selectOption('Ethereum')

    await secondary.getByLabel('Tipo de carteira', { exact: true })
        .selectOption('MetaMask')

    const address = secondary.getByLabel('Endereço da carteira', {
        exact: true,
    })
    const saveSecondary = secondary.getByRole('button', {
        name: 'Salvar carteira',
        exact: true,
    })

    await address.fill('endereco-invalido')
    await saveSecondary.click()

    await expect(address).toHaveAttribute('aria-invalid', 'true')

    await expect(secondary.getByText(
        'Informe um endereço válido para a rede selecionada.',
        { exact: true },
    )).toBeVisible()

    await address.fill(primaryAddress)
    await saveSecondary.click()

    await expect(secondary.getByRole('alert')).toHaveText(
        'Esta carteira já está cadastrada no outro espaço.',
    )

    const secondaryAddress = `0x${'2'.repeat(40)}`

    await address.fill(secondaryAddress)
    await saveSecondary.click()

    await expect(secondary.getByRole('status')).toHaveText(
        'Carteira salva.',
    )

    await primary.getByLabel('Apelido da carteira', { exact: true })
        .fill('Principal atualizada')

    await primary.getByRole('button', {
        name: 'Salvar carteira',
        exact: true,
    }).click()

    await expect(primary.getByRole('status')).toHaveText(
        'Carteira salva.',
    )

    await page.reload()

    await expect(
        primary.getByLabel('Apelido da carteira', { exact: true }),
    ).toHaveValue('Principal atualizada')

    await expect(
        primary.getByLabel('Endereço da carteira', { exact: true }),
    ).toHaveValue(primaryAddress)

    await expect(
        secondary.getByLabel('Endereço da carteira', { exact: true }),
    ).toHaveValue(secondaryAddress)

    await expect(
        secondary.getByLabel('Apelido da carteira', { exact: true }),
    ).toHaveValue('Secundária')
})