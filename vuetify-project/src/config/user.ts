export enum Organization {
  AKADEMIK = 'akademik',
  REKTOR = 'rektor',
}

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface UserCredentials {
  username: string
  password: string
  accessToken?: string // Token dari Fablo REST API setelah enroll
  tokenExpiry?: Date // Waktu expired token
}

export interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  role: Role
  organization: Organization
  isActive: boolean
}

export interface UserWithCredentials extends User {
  credentials: UserCredentials
}
