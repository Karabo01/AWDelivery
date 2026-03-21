import api from '@/services/api'
import type {
	CreateOrderRequest,
	CreateOrderResponse,
	PaginatedResponse,
	QuoteRequest,
	QuoteResponse,
	TrackOrderResponse,
} from '@/types'
import type { Order } from '@/types/order.types'

type OrdersQuery = {
	page?: number
	pageSize?: number
}

async function getQuote(payload: QuoteRequest) {
	const { data } = await api.post<QuoteResponse>('/orders/quote', payload)
	return data
}

async function createOrder(payload: CreateOrderRequest) {
	const { data } = await api.post<CreateOrderResponse>('/orders', payload)
	return data
}

async function getMyOrders(query?: OrdersQuery) {
	const { data } = await api.get<PaginatedResponse<Order>>('/orders/mine', {
		params: query,
	})
	return data
}

async function trackOrder(trackingNumber: string) {
	const { data } = await api.get<TrackOrderResponse>(`/orders/track/${trackingNumber}`)
	return data
}

export { createOrder, getMyOrders, getQuote, trackOrder }
