import api from '@/services/api'
import type { InitiatePaymentRequest, InitiatePaymentResponse } from '@/types'

async function initiatePayment(payload: InitiatePaymentRequest) {
	const { data } = await api.post<InitiatePaymentResponse>('/payments/initiate', payload)
	return data
}

/**
 * Submit a PayFast payment form via POST redirect.
 * Creates a hidden form with all payment data and submits it.
 */
function submitPayFastForm(redirectUrl: string, formData: Record<string, string>) {
	const form = document.createElement('form')
	form.method = 'POST'
	form.action = redirectUrl

	for (const [key, value] of Object.entries(formData)) {
		const input = document.createElement('input')
		input.type = 'hidden'
		input.name = key
		input.value = value
		form.appendChild(input)
	}

	document.body.appendChild(form)
	form.submit()
}

export { initiatePayment, submitPayFastForm }
