const storageKey = 'kurio:session-token'

export function getAuthToken() {
    return localStorage.getItem(storageKey)
}

export function setAuthToken(token: string) {
    localStorage.setItem(storageKey, token)
}

export function clearAuthToken() {
    localStorage.removeItem(storageKey)
}