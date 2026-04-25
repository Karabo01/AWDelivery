import type { Address } from './order.types'

export interface User {
  readonly id: string
  readonly phone: string
  readonly name: string
  readonly surname: string
  readonly email: string
  readonly isVerified: boolean
  readonly defaultAddress?: Address
  readonly isAdmin: boolean
  readonly isSuperAdmin?: boolean
  readonly createdAt: string
}

export interface AuthPayload {
  readonly userId: string
  readonly phone: string
  readonly isAdmin: boolean
}
