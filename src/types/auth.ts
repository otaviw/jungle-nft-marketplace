export interface User {
  id: string
  name: string
  email: string
}

export interface Session {
  user: User
  token: string
  expiresAt: number
}