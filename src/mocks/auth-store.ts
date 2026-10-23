import type { Session, User } from '@/types/auth'

interface StoredUser extends User {
    passwordHash: string
    salt: string
}

interface StoredSession {
    userId: string
    expiresAt: number
}

interface AuthDatabase {
    users: StoredUser[]
    sessions: Record<string, StoredSession>
}

const storageKey = 'kurio:auth-db:v1'
const sessionDuration = 60 * 60 * 1000

function readDatabase(): AuthDatabase {
    const stored = localStorage.getItem(storageKey)

    return stored
        ? JSON.parse(stored) as AuthDatabase
        : { users: [], sessions: {} }
}

function writeDatabase(database: AuthDatabase) {
    localStorage.setItem(storageKey, JSON.stringify(database))
}

function publicUser(user: StoredUser): User {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
    }
}

export async function hashPassword(password: string, salt: string) {
    const encoder = new TextEncoder()

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    )

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100_000,
            hash: 'SHA-256',
        },
        key,
        256,
    )

    return Array.from(new Uint8Array(bits))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

export async function createUser(input: {
    name: string
    email: string
    password: string
}): Promise<User | null> {
    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(input.password, salt)

    // Lemos novamente depois da operação assíncrona para conferir conflitos.
    const database = readDatabase()

    if (database.users.some((user) => user.email === input.email)) {
        return null
    }

    const user: StoredUser = {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
        salt,
        passwordHash,
    }

    database.users.push(user)
    writeDatabase(database)

    return publicUser(user)
}

export async function checkCredentials(
    email: string,
    password: string,
): Promise<User | null> {
    const user = readDatabase().users.find((user) => user.email === email)

    if (!user) {
        return null
    }

    const passwordHash = await hashPassword(password, user.salt)

    return passwordHash === user.passwordHash ? publicUser(user) : null
}

export function createSession(user: User): Session {
    const database = readDatabase()
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + sessionDuration

    database.sessions[token] = { userId: user.id, expiresAt }
    writeDatabase(database)

    return { user, token, expiresAt }
}

export function getSession(token: string): Session | null {
    const database = readDatabase()
    const session = database.sessions[token]

    if (!session) {
        return null
    }

    if (session.expiresAt <= Date.now()) {
        delete database.sessions[token]
        writeDatabase(database)
        return null
    }

    const user = database.users.find((user) => user.id === session.userId)

    return user
        ? { user: publicUser(user), token, expiresAt: session.expiresAt }
        : null
}

export function removeSession(token: string) {
    const database = readDatabase()

    delete database.sessions[token]
    writeDatabase(database)
}

export async function seedAuth() {
    const accounts = [
        { name: 'Colecionador Demo', email: 'demo@kurio.test' },
        { name: 'Outro Colecionador', email: 'outro@kurio.test' },
    ]

    for (const account of accounts) {
        if (!readDatabase().users.some((user) => user.email === account.email)) {
            await createUser({
                ...account,
                password: 'Kurio123!',
            })
        }
    }
}

export function updateUserAccount(
    userId: string,
    input: { name: string; email: string },
): User | null {
    const database = readDatabase()

    const conflict = database.users.some(
        (user) => user.email === input.email && user.id !== userId,
    )

    if (conflict) {
        return null
    }

    const user = database.users.find((user) => user.id === userId)

    if (!user) {
        throw new Error('Usuário não encontrado.')
    }

    user.name = input.name
    user.email = input.email

    writeDatabase(database)

    return publicUser(user)
}

export async function changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentToken: string,
): Promise<boolean> {
    const user = readDatabase().users.find((user) => user.id === userId)

    if (!user) {
        return false
    }

    const currentHash = await hashPassword(currentPassword, user.salt)

    if (currentHash !== user.passwordHash) {
        return false
    }

    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(newPassword, salt)

    const database = readDatabase()
    const storedUser = database.users.find((user) => user.id === userId)

    if (!storedUser || storedUser.passwordHash !== user.passwordHash) {
        return false
    }

    storedUser.salt = salt
    storedUser.passwordHash = passwordHash

    for (const [token, session] of Object.entries(database.sessions)) {
        if (session.userId === userId && token !== currentToken) {
            delete database.sessions[token]
        }
    }

    writeDatabase(database)

    return true
}