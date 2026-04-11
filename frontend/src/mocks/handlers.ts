import { delay, http, HttpResponse, type RequestHandler } from 'msw'

import {
	OrderStatus,
	ParcelSize,
	PaymentStatus,
	type CreateOrderRequest,
	type Order,
	type OrderTimeline,
	type QuoteRequest,
	type User,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const OTP_CODE = '123456'
const MIN_DELAY_MS = 300
const MAX_DELAY_MS = 600

async function mockNetworkDelay() {
	const randomMs =
		Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS
	await delay(randomMs)
}

let currentUser: User | null = null
const otpStore = new Map<string, string>()
const quotes = new Map<
	string,
	{
		payload: QuoteRequest
		amount: number
		distanceKm: number
		createdAt: number
	}
>()

const timelines = new Map<string, OrderTimeline>()

const sampleOrder: Order = {
	id: crypto.randomUUID(),
	trackingNumber: 'AW-X7K9M2',
	senderId: 'mock-user-1',
	pickupAddress: {
		street: '5 Rivonia Road',
		suburb: 'Sandton',
		city: 'Johannesburg',
		postalCode: '2196',
		province: 'Gauteng',
		coordinates: { lat: -26.1076, lng: 28.0567 },
		notes: 'Reception desk',
	},
	deliveryAddress: {
		street: '2 Heuwel Avenue',
		suburb: 'Centurion',
		city: 'Pretoria',
		postalCode: '0157',
		province: 'Gauteng',
		coordinates: { lat: -25.8603, lng: 28.1896 },
		notes: 'Guard gate',
	},
	parcelDetails: {
		size: ParcelSize.MEDIUM,
		weightKg: 2.5,
		description: 'Documents',
	},
	status: OrderStatus.IN_TRANSIT,
	quoteAmount: 8500,
	paymentStatus: PaymentStatus.PAID,
	receiverPhone: '+27823456789',
	receiverEmail: 'receiver@example.com',
	createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
	updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
}

const orders: Order[] = [sampleOrder]

timelines.set(sampleOrder.trackingNumber, [
	{ status: OrderStatus.PENDING_PAYMENT, timestamp: sampleOrder.createdAt },
	{
		status: OrderStatus.CONFIRMED,
		timestamp: new Date(new Date(sampleOrder.createdAt).getTime() + 1000 * 60 * 2).toISOString(),
	},
	{
		status: OrderStatus.PICKED_UP,
		timestamp: new Date(new Date(sampleOrder.createdAt).getTime() + 1000 * 60 * 55).toISOString(),
		note: 'Collected from reception',
	},
	{
		status: OrderStatus.IN_TRANSIT,
		timestamp: sampleOrder.updatedAt,
		note: 'On route to receiver',
	},
])

function makeApiError(message: string, code: string, statusCode: number) {
	return HttpResponse.json(
		{
			message,
			code,
			statusCode,
		},
		{ status: statusCode },
	)
}

function ensureAuthenticated() {
	if (!currentUser) {
		return makeApiError('Unauthorized', 'UNAUTHORIZED', 401)
	}

	return null
}

function randomTrackingNumber() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	let suffix = ''
	for (let i = 0; i < 6; i += 1) {
		suffix += chars[Math.floor(Math.random() * chars.length)]
	}
	return `AW-${suffix}`
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
	const toRad = (value: number) => (value * Math.PI) / 180
	const earthRadius = 6371

	const dLat = toRad(lat2 - lat1)
	const dLng = toRad(lng2 - lng1)

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2)

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return earthRadius * c
}

function sizeSurcharge(parcelSize: ParcelSize) {
	if (parcelSize === ParcelSize.MEDIUM) {
		return 1000
	}
	if (parcelSize === ParcelSize.LARGE) {
		return 2500
	}
	return 0
}

export const handlers: RequestHandler[] = [
	http.post(`${API_URL}/auth/register`, async ({ request }) => {
		await mockNetworkDelay()

		const body = (await request.json()) as {
			name?: string
			surname?: string
			phone?: string
			email?: string
			password?: string
		}
		const email = body.email ?? ''

		if (!email) {
			return makeApiError('Invalid email address', 'INVALID_EMAIL', 400)
		}

		otpStore.set(email, OTP_CODE)
		return HttpResponse.json(
			{ message: 'Account created. Please verify your email address.' },
			{ status: 201 },
		)
	}),

	http.post(`${API_URL}/auth/login`, async ({ request }) => {
		await mockNetworkDelay()

		const body = (await request.json()) as { email?: string; password?: string }
		const email = body.email ?? ''
		const password = body.password ?? ''

		if (!email) {
			return makeApiError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
		}

		if (!password) {
			return makeApiError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
		}

		// Mock: any valid email + password logs in directly
		const seededUser: User = {
			id: 'mock-user-1',
			phone: '+27810000000',
			name: 'Demo',
			surname: 'Sender',
			email,
			isVerified: true,
			isAdmin: false,
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
		}

		currentUser = seededUser
		return HttpResponse.json({ user: seededUser })
	}),

	http.post(`${API_URL}/auth/send-otp`, async ({ request }) => {
		await mockNetworkDelay()

		const body = (await request.json()) as { email?: string }
		const email = body.email ?? ''

		if (!email) {
			return makeApiError('Invalid email address', 'INVALID_EMAIL', 400)
		}

		otpStore.set(email, OTP_CODE)
		return HttpResponse.json({ message: 'OTP sent successfully' })
	}),

	http.post(`${API_URL}/auth/verify-otp`, async ({ request }) => {
		await mockNetworkDelay()

		const body = (await request.json()) as { email?: string; code?: string }
		const email = body.email ?? ''
		const code = body.code ?? ''

		if (!email) {
			return makeApiError('Invalid email address', 'INVALID_EMAIL', 400)
		}

		if (!otpStore.has(email) || otpStore.get(email) !== code) {
			return makeApiError('OTP is invalid or expired', 'INVALID_OTP', 400)
		}

		const seededUser: User = {
			id: 'mock-user-1',
			phone: '+27810000000',
			name: 'Demo',
			surname: 'Sender',
			email,
			isVerified: true,
			isAdmin: false,
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
		}

		currentUser = seededUser
		otpStore.delete(email)

		return HttpResponse.json({ user: seededUser })
	}),

	http.post(`${API_URL}/auth/resend-otp`, async ({ request }) => {
		await mockNetworkDelay()

		const body = (await request.json()) as { email?: string }
		const email = body.email ?? ''

		if (!email) {
			return makeApiError('Invalid email address', 'INVALID_EMAIL', 400)
		}

		otpStore.set(email, OTP_CODE)
		return HttpResponse.json({ message: 'If an account exists, an OTP has been sent.' })
	}),

	http.post(`${API_URL}/auth/logout`, async () => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		currentUser = null
		return HttpResponse.json({ message: 'Logged out' })
	}),

	http.get(`${API_URL}/auth/me`, async () => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		return HttpResponse.json({ user: currentUser })
	}),

	http.post(`${API_URL}/orders/quote`, async ({ request }) => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		const body = (await request.json()) as QuoteRequest

		const distanceKm = haversineKm(
			body.pickupAddress.coordinates.lat,
			body.pickupAddress.coordinates.lng,
			body.deliveryAddress.coordinates.lat,
			body.deliveryAddress.coordinates.lng,
		)

		const baseFare = 3500
		const distanceFare = Math.round(distanceKm * 180)
		const surcharge = sizeSurcharge(body.parcelSize)
		const amount = baseFare + distanceFare + surcharge

		const quoteToken = `mock_quote_${crypto.randomUUID()}`
		quotes.set(quoteToken, {
			payload: body,
			amount,
			distanceKm,
			createdAt: Date.now(),
		})

		return HttpResponse.json({
			quoteToken,
			amount,
			distanceKm,
			breakdown: {
				baseFare,
				distanceFare,
				sizeSurcharge: surcharge,
			},
		})
	}),

	http.post(`${API_URL}/orders`, async ({ request }) => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		const body = (await request.json()) as CreateOrderRequest

		if (!/^\+27\d{9}$/.test(body.receiverPhone)) {
			return makeApiError('Invalid phone number format', 'INVALID_PHONE', 400)
		}

		const quoted = quotes.get(body.quoteToken)
		if (!quoted) {
			return makeApiError('Quote token is invalid', 'QUOTE_INVALID', 400)
		}

		if (Date.now() - quoted.createdAt > 1000 * 60 * 10) {
			return makeApiError('Quote token has expired', 'QUOTE_EXPIRED', 400)
		}

		const now = new Date().toISOString()
		const trackingNumber = randomTrackingNumber()

		const order: Order = {
			id: crypto.randomUUID(),
			trackingNumber,
			senderId: currentUser!.id,
			pickupAddress: body.pickupAddress,
			deliveryAddress: body.deliveryAddress,
			parcelDetails: body.parcelDetails,
			status: OrderStatus.PENDING_PAYMENT,
			quoteAmount: quoted.amount,
			paymentStatus: PaymentStatus.PENDING,
			receiverPhone: body.receiverPhone,
			receiverEmail: body.receiverEmail,
			createdAt: now,
			updatedAt: now,
		}

		orders.unshift(order)
		timelines.set(trackingNumber, [{ status: OrderStatus.PENDING_PAYMENT, timestamp: now }])

		return HttpResponse.json(
			{
				order,
				paymentUrl: `https://sandbox.payfast.co.za/eng/process`,
				paymentFormData: {
					merchant_id: '10047175',
					merchant_key: 'test_key',
					amount: (quoted.amount / 100).toFixed(2),
					item_name: `AWDelivery ${trackingNumber}`,
					signature: 'mock_signature',
				},
			},
			{ status: 201 },
		)
	}),

	http.get(`${API_URL}/orders/mine`, async ({ request }) => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		const url = new URL(request.url)
		const page = Number(url.searchParams.get('page') ?? '1')
		const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

		const mine = orders.filter((order) => order.senderId === currentUser!.id)
		const start = (page - 1) * pageSize
		const end = start + pageSize

		return HttpResponse.json({
			data: mine.slice(start, end),
			total: mine.length,
			page,
			pageSize,
		})
	}),

	http.get(`${API_URL}/orders/track/:trackingNumber`, async ({ params }) => {
		await mockNetworkDelay()

		const trackingNumber = String(params.trackingNumber ?? '')
		const order = orders.find((item) => item.trackingNumber === trackingNumber)

		if (!order) {
			return makeApiError('Order not found', 'ORDER_NOT_FOUND', 404)
		}

		return HttpResponse.json({
			order,
			timeline: timelines.get(trackingNumber) ?? [],
		})
	}),

	http.post(`${API_URL}/payments/initiate`, async ({ request }) => {
		await mockNetworkDelay()

		const unauthorized = ensureAuthenticated()
		if (unauthorized) {
			return unauthorized
		}

		const body = (await request.json()) as { orderId?: string }
		const orderId = body.orderId ?? ''

		const order = orders.find((item) => item.id === orderId)
		if (!order) {
			return makeApiError('Order not found', 'ORDER_NOT_FOUND', 404)
		}

		if (order.paymentStatus === PaymentStatus.PAID) {
			return makeApiError(
				'A payment for this order has already been completed',
				'DUPLICATE_PAYMENT',
				409,
			)
		}

		return HttpResponse.json({
			redirectUrl: 'https://sandbox.payfast.co.za/eng/process',
			formData: {
				merchant_id: '10000100',
				merchant_key: '46f0cd694581a',
				amount: (order.quoteAmount / 100).toFixed(2),
				item_name: `AWDelivery ${order.trackingNumber}`,
				m_payment_id: order.id,
			},
		})
	}),
]
