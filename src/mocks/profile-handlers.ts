import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { User } from '@/types/auth'
import type { Profile } from '@/types/profile'
import {
    changeUserPassword,
    getSession,
    updateUserAccount,
} from './auth-store'

const profileSchema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    displayName: z.string().trim().min(2).max(80),
    ens: z.string().trim().max(100).refine(
        (value) => !value || /^[a-z0-9-]+\.eth$/i.test(value),
        'Informe um nome terminado em .eth.',
    ),
    walletNickname: z.string().trim().max(80),
})

function getUser(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user ?? null
}

function readProfile(user: User): Profile {
    const stored = localStorage.getItem(`kurio:profile:${user.id}`)

    const extra = stored
        ? JSON.parse(stored) as Partial<Profile>
        : {}

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: extra.displayName ?? user.name,
        ens: extra.ens ?? '',
        walletNickname: extra.walletNickname ?? '',
        avatar: extra.avatar ?? null,
    }
}

const passwordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
    confirmation: z.string().min(1),
}).refine(
    (input) => input.newPassword === input.confirmation,
    {
        message: 'As senhas precisam ser iguais.',
        path: ['confirmation'],
    },
).refine(
    (input) => input.currentPassword !== input.newPassword,
    {
        message: 'Escolha uma senha diferente da atual.',
        path: ['newPassword'],
    },
)

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result)
            } else {
                reject(new Error('Não foi possível ler a imagem.'))
            }
        }

        reader.onerror = () => reject(new Error('Erro ao ler a imagem.'))
        reader.readAsDataURL(file)
    })
}

export const profileHandlers = [
    http.get('/api/profile', async ({ request }) => {
        await delay(300)

        const user = getUser(request)

        if (!user) {
            return HttpResponse.json(
                { message: 'Entre novamente para acessar seu perfil.' },
                { status: 401 },
            )
        }

        return HttpResponse.json(readProfile(user))
    }),

    http.patch('/api/profile', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)

        await delay(300)

        const user = getUser(request)

        if (!user) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const result = profileSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Confira os campos do perfil.',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        const updatedUser = updateUserAccount(user.id, result.data)

        if (!updatedUser) {
            return HttpResponse.json(
                {
                    message: 'Este e-mail já pertence a outra conta.',
                    errors: { email: ['Escolha outro e-mail.'] },
                },
                { status: 409 },
            )
        }

        const profile: Profile = {
            ...readProfile(updatedUser),
            ...result.data,
        }

        localStorage.setItem(
            `kurio:profile:${user.id}`,
            JSON.stringify(profile),
        )

        return HttpResponse.json(profile)
    }),

    http.post('/api/profile/password', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)
        const user = getUser(request)

        if (!user) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const result = passwordSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Confira os campos da senha.',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        const token = request.headers.get('Authorization')
            ?.replace(/^Bearer /, '') ?? ''

        const changed = await changeUserPassword(
            user.id,
            result.data.currentPassword,
            result.data.newPassword,
            token,
        )

        if (!changed) {
            return HttpResponse.json(
                {
                    message: 'Não foi possível alterar a senha.',
                    errors: { currentPassword: ['Confira sua senha atual.'] },
                },
                { status: 422 },
            )
        }

        return new HttpResponse(null, { status: 204 })
    }),

    http.post('/api/profile/avatar', async ({ request }) => {
        const user = getUser(request)

        if (!user) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const form = await request.formData().catch(() => null)
        const file = form?.get('avatar')

        if (
            !(file instanceof File)
            || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
            || file.size === 0
            || file.size > 2 * 1024 * 1024
        ) {
            return HttpResponse.json(
                { message: 'Envie uma imagem PNG, JPG ou WebP de até 2 MB.' },
                { status: 422 },
            )
        }

        const avatar = await fileToDataUrl(file)

        // Confere novamente a sessão após a leitura assíncrona.
        const currentUser = getUser(request)

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const profile = { ...readProfile(currentUser), avatar }

        try {
            localStorage.setItem(
                `kurio:profile:${currentUser.id}`,
                JSON.stringify(profile),
            )
        } catch {
            return HttpResponse.json(
                { message: 'Não há espaço para salvar esta imagem. Tente uma menor.' },
                { status: 503 },
            )
        }

        return HttpResponse.json(profile)
    }),

    http.delete('/api/profile/avatar', ({ request }) => {
        const user = getUser(request)

        if (!user) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const profile = { ...readProfile(user), avatar: null }

        localStorage.setItem(
            `kurio:profile:${user.id}`,
            JSON.stringify(profile),
        )

        return HttpResponse.json(profile)
    }),
]