const resetKey = 'kurio:reset-requested'

function clearProjectStorage() {
    for (const storage of [localStorage, sessionStorage]) {
        for (const key of Object.keys(storage)) {
            if (key.startsWith('kurio:')) {
                storage.removeItem(key)
            }
        }
    }
}

export function requestMockReset() {
    clearProjectStorage()
    sessionStorage.setItem(resetKey, 'true')
}

export function applyPendingReset() {
    if (sessionStorage.getItem(resetKey) === 'true') {
        // Repete a limpeza após descartar a página antiga: requests e sockets
        // que ainda estavam encerrando não podem repovoar o cenário novo.
        clearProjectStorage()
    }
}
