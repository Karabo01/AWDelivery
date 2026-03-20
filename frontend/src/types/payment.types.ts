import type { PaymentStatus } from './order.types'

export interface Payment {
  readonly id: string
  readonly orderId: string
  readonly amount: number
  readonly gateway: string
  readonly reference: string
  readonly status: PaymentStatus
  readonly createdAt: string
}

export interface PayFastPayload {
  readonly m_payment_id: string
  readonly pf_payment_id: string
  readonly payment_status: string
  readonly item_name: string
  readonly item_description: string
  readonly amount_gross: string
  readonly amount_fee: string
  readonly amount_net: string
  readonly custom_str1: string
  readonly custom_str2: string
  readonly custom_str3: string
  readonly custom_str4: string
  readonly custom_str5: string
  readonly custom_int1: string
  readonly custom_int2: string
  readonly custom_int3: string
  readonly custom_int4: string
  readonly custom_int5: string
  readonly name_first: string
  readonly name_last: string
  readonly email_address: string
  readonly merchant_id: string
  readonly signature: string
}
