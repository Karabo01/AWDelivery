import api from '@/services/api'
import type {
	BulkQuoteRequest,
	BulkQuoteResponse,
	CreateBulkOrderRequest,
	CreateBulkOrderResponse,
	CreateOrderRequest,
	CreateOrderResponse,
	PaginatedResponse,
	QuoteRequest,
	QuoteResponse,
	TrackOrderResponse,
} from '@/types'
import type { Invoice, Order } from '@/types/order.types'

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

async function getBulkQuote(payload: BulkQuoteRequest) {
	const { data } = await api.post<BulkQuoteResponse>('/orders/bulk/quote', payload)
	return data
}

async function createBulkOrder(payload: CreateBulkOrderRequest) {
	const { data } = await api.post<CreateBulkOrderResponse>('/orders/bulk', payload)
	return data
}

async function getMyInvoices(query?: OrdersQuery) {
	const { data } = await api.get<PaginatedResponse<Invoice>>('/orders/invoices/mine', {
		params: query,
	})
	return data
}

export {
	createBulkOrder,
	createOrder,
	getBulkQuote,
	getMyInvoices,
	getMyOrders,
	getQuote,
	trackOrder,
}
