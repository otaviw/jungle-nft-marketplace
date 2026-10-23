import axios from 'axios'
import { getAuthToken } from './auth-token'

export const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
})

api.interceptors.request.use((config) => {
    const token = getAuthToken()

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})