export type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK'

export interface Driver {
  readonly id: string
  readonly name: string
  readonly phone: string
  readonly email?: string | null
  readonly vehicleType: VehicleType
  readonly vehiclePlate?: string | null
  readonly isActive: boolean
  readonly orderCount?: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateDriverPayload {
  name: string
  phone: string
  email?: string
  vehicleType: VehicleType
  vehiclePlate?: string
}

export interface UpdateDriverPayload {
  name?: string
  phone?: string
  email?: string | null
  vehicleType?: VehicleType
  vehiclePlate?: string | null
  isActive?: boolean
}

export interface AdminStats {
  orders: {
    total: number
    delivered: number
    pending: number
    thisMonth: number
  }
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
  }
  drivers: {
    total: number
    active: number
  }
  ordersByStatus: Array<{
    status: string
    count: number
  }>
}
