import api from '@/services/api'
import type { Order, OrderStatus } from '@/types/order.types'
import type { User } from '@/types/user.types'
import type { Driver, CreateDriverPayload, UpdateDriverPayload, AdminStats } from '@/types/driver.types'

export { api }

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

interface AdminOrder extends Order {
  driver: Driver | null
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers(params?: {
  page?: number
  pageSize?: number
  search?: string
}): Promise<PaginatedResponse<User & { orderCount: number }>> {
  const response = await api.get('/admin/users', { params })
  return response.data
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getOrders(params?: {
  page?: number
  pageSize?: number
  status?: OrderStatus
  search?: string
}): Promise<PaginatedResponse<AdminOrder>> {
  const response = await api.get('/admin/orders', { params })
  return response.data
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<{ order: Order }> {
  const response = await api.patch(`/admin/orders/${orderId}/status`, { status, note })
  return response.data
}

export async function assignDriver(
  orderId: string,
  driverId: string | null
): Promise<{ order: AdminOrder }> {
  const response = await api.patch(`/admin/orders/${orderId}/driver`, { driverId })
  return response.data
}

export async function notifyOrder(
  orderId: string,
  templateType: string,
  recipient: 'sender' | 'receiver' | 'both'
): Promise<{ message: string }> {
  const response = await api.post(`/admin/orders/${orderId}/notify`, { templateType, recipient })
  return response.data
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function getDrivers(params?: {
  page?: number
  pageSize?: number
  isActive?: boolean
  search?: string
}): Promise<PaginatedResponse<Driver>> {
  const response = await api.get('/admin/drivers', { params })
  return response.data
}

export async function createDriver(data: CreateDriverPayload): Promise<{ driver: Driver }> {
  const response = await api.post('/admin/drivers', data)
  return response.data
}

export async function updateDriver(
  driverId: string,
  data: UpdateDriverPayload
): Promise<{ driver: Driver }> {
  const response = await api.patch(`/admin/drivers/${driverId}`, data)
  return response.data
}

export async function deleteDriver(driverId: string): Promise<{ message: string; driver?: Driver }> {
  const response = await api.delete(`/admin/drivers/${driverId}`)
  return response.data
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(): Promise<AdminStats> {
  const response = await api.get('/admin/stats')
  return response.data
}
