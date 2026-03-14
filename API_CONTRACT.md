# AWDelivery — API Contract

> **Source of truth** for backend, frontend, and integrations developers.
> All types referenced below live in `/shared/types/`.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Authentication Model](#authentication-model)
3. [Phone Number Format](#phone-number-format)
4. [Address Format](#address-format)
5. [Quote Token](#quote-token)
6. [Order Status Flow](#order-status-flow)
7. [Error Response Format](#error-response-format)
8. [Webhook Security](#webhook-security)
9. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [Orders](#orders)
   - [Payments](#payments)
   - [WhatsApp](#whatsapp)
   - [Admin](#admin)
   - [System](#system)

---

## Conventions

| Item | Value |
|------|-------|
| Local dev base URL | `http://localhost:3000` |
| Route prefix | `/api` |
| Content-Type | `application/json` for all requests and responses |
| ID format | UUIDv4 |
| Timestamps | ISO 8601 strings (`2026-03-14T10:30:00.000Z`) |
| Currency | ZAR, amounts in **cents** (integer) |

---

## Authentication Model

- JWT stored in an **httpOnly, Secure, SameSite=Strict** cookie named `awdelivery_token`.
- Cookie is **set** on successful OTP verification (`POST /api/auth/verify-otp`).
- Cookie is **cleared** on logout (`POST /api/auth/logout`).
- All protected routes return `401 Unauthorized` if the cookie is missing or the JWT is invalid/expired.
- Admin-only routes return `403 Forbidden` if `user.isAdmin` is `false`.
- JWT payload shape: `AuthPayload` (`userId`, `phone`, `isAdmin`).

---

## Phone Number Format

- All phone numbers **must** be E.164 format: `+27XXXXXXXXX` (South Africa).
- Backend validates against the regex: `/^\+27\d{9}$/`.
- Frontend is responsible for formatting before sending (e.g. stripping leading `0`).
- Requests with invalid phone numbers receive a `400` with code `INVALID_PHONE`.

---

## Address Format

All addresses use the shared `Address` type:

```ts
{
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  province: string;
  coordinates: { lat: number; lng: number };
  notes?: string; // optional landmark
}
```

- `coordinates` is **required** for pickup and delivery addresses.
- Frontend populates coordinates via Google Maps Places Autocomplete.
- Backend validates that coordinates fall within the Gauteng bounding box.

---

## Quote Token

- Returned by `POST /api/orders/quote`.
- Signed JWT containing the quoted price, addresses, and parcel size.
- **Valid for 10 minutes** from issue time.
- Must be submitted with `POST /api/orders` to lock in the quoted price.
- If expired, the frontend must request a new quote.
- Prevents price manipulation — the backend re-verifies the token on order creation.

---

## Order Status Flow

```
PENDING_PAYMENT ──→ CONFIRMED ──→ PICKUP_SCHEDULED ──→ PICKED_UP ──→ IN_TRANSIT ──→ DELIVERED
                                                                         │
                                                                         ├──→ FAILED
                                                                         │
                                                                         └──→ DELAYED ──→ IN_TRANSIT
```

- `PENDING_PAYMENT → CONFIRMED`: triggered automatically when PayFast ITN confirms payment.
- `CONFIRMED → PICKUP_SCHEDULED`: admin assigns a driver / schedules collection.
- `PICKUP_SCHEDULED → PICKED_UP`: admin confirms parcel collected from sender.
- `PICKED_UP → IN_TRANSIT`: admin marks parcel en route.
- `IN_TRANSIT → DELIVERED`: admin confirms successful delivery.
- `IN_TRANSIT → FAILED`: delivery could not be completed (address wrong, receiver unavailable, etc.).
- `IN_TRANSIT → DELAYED`: temporary hold (weather, vehicle issue, etc.) — can resume to `IN_TRANSIT`.

---

## Error Response Format

All errors return the `ApiError` shape:

```json
{
  "message": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "statusCode": 400
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `INVALID_PHONE` | 400 | Phone number does not match E.164 / +27 format |
| `INVALID_OTP` | 400 | OTP code is incorrect or expired |
| `QUOTE_EXPIRED` | 400 | Quote token has expired (>10 min) |
| `QUOTE_INVALID` | 400 | Quote token signature is invalid or tampered |
| `INVALID_STATUS_TRANSITION` | 400 | The requested status change is not allowed from the current status |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication cookie |
| `FORBIDDEN` | 403 | User does not have admin privileges |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `ORDER_NOT_FOUND` | 404 | No order found with the given ID or tracking number |
| `PAYMENT_FAILED` | 402 | Payment could not be processed |
| `DUPLICATE_PAYMENT` | 409 | A payment for this order has already been completed |
| `RATE_LIMITED` | 429 | Too many OTP requests — try again later |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `WEBHOOK_SIGNATURE_INVALID` | 400 | Webhook payload failed signature verification |

---

## Webhook Security

### PayFast ITN

- PayFast sends a `POST` to `/api/payments/webhook` after each transaction.
- Backend **must** validate the MD5 signature before writing to the database.
- Validation steps: reconstruct the param string (alphabetical, excluding `signature`), append the passphrase, MD5 hash, compare.
- Endpoint must return `200 OK` immediately; payment processing happens asynchronously.
- If signature check fails, return `200` anyway (PayFast retries on non-200) but log and discard.

### WhatsApp Business API

- Provider sends delivery status updates to `POST /api/whatsapp/webhook`.
- Validate the provider's signature header before processing.
- Return `200 OK` immediately; update delivery status asynchronously.

---

## Endpoints

---

### Auth

---

#### `POST /api/auth/send-otp`

Send a one-time password to the given phone number via WhatsApp/SMS.

| | |
|---|---|
| **Auth** | Public |
| **Rate limit** | 3 requests per phone per 5 minutes |

**Request body:** `SendOtpRequest`

```json
{
  "phone": "+27812345678"
}
```

**Success response:** `200 OK` — `SendOtpResponse`

```json
{
  "message": "OTP sent successfully"
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_PHONE` | Phone doesn't match `/^\+27\d{9}$/` |
| 429 | `RATE_LIMITED` | Too many OTP requests for this phone |

**Business rules:**
- OTP is 6 digits, valid for 5 minutes.
- If the phone number does not belong to an existing user, a new user record is created on verify.

---

#### `POST /api/auth/verify-otp`

Verify the OTP and authenticate the user. Sets the `awdelivery_token` cookie.

| | |
|---|---|
| **Auth** | Public |

**Request body:** `VerifyOtpRequest`

```json
{
  "phone": "+27812345678",
  "code": "482910"
}
```

**Success response:** `200 OK` — `VerifyOtpResponse`

Sets `awdelivery_token` httpOnly cookie.

```json
{
  "user": {
    "id": "uuid",
    "phone": "+27812345678",
    "name": "",
    "isAdmin": false,
    "createdAt": "2026-03-14T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_PHONE` | Phone format invalid |
| 400 | `INVALID_OTP` | OTP is wrong or expired |

**Business rules:**
- If no user exists for this phone, one is created with an empty `name`.
- JWT expires in 7 days.

---

#### `POST /api/auth/logout`

Clear the authentication cookie.

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Request body:** None

**Success response:** `200 OK`

```json
{
  "message": "Logged out"
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid cookie |

---

#### `GET /api/auth/me`

Return the currently authenticated user.

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Request body:** None

**Success response:** `200 OK`

```json
{
  "user": { "...User" }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid cookie |

---

### Orders

---

#### `POST /api/orders/quote`

Calculate a delivery quote based on pickup/delivery addresses and parcel size.

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Request body:** `QuoteRequest`

```json
{
  "pickupAddress": { "...Address" },
  "deliveryAddress": { "...Address" },
  "parcelSize": "MEDIUM"
}
```

**Success response:** `200 OK` — `QuoteResponse`

```json
{
  "quoteToken": "eyJhbGciOi...",
  "amount": 8500,
  "distanceKm": 22.4,
  "breakdown": {
    "baseFare": 3500,
    "distanceFare": 4000,
    "sizeSurcharge": 1000
  }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `UNAUTHORIZED` | No valid cookie |

**Business rules:**
- Distance calculated using Haversine formula from coordinates.
- Pricing: baseFare + (distanceKm × perKmRate) + sizeSurcharge.
- Size surcharges: SMALL = R0, MEDIUM = R10, LARGE = R25.
- Quote token is a signed JWT valid for 10 minutes.
- Both addresses must have coordinates within Gauteng.

---

#### `POST /api/orders`

Create a new delivery order. Initiates a PayFast payment session.

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Request body:** `CreateOrderRequest`

```json
{
  "pickupAddress": { "...Address" },
  "deliveryAddress": { "...Address" },
  "parcelDetails": {
    "size": "MEDIUM",
    "weightKg": 2.5,
    "description": "Documents"
  },
  "receiverPhone": "+27823456789",
  "quoteToken": "eyJhbGciOi..."
}
```

**Success response:** `201 Created` — `CreateOrderResponse`

```json
{
  "order": { "...Order (status: PENDING_PAYMENT)" },
  "paymentUrl": "https://www.payfast.co.za/eng/process?..."
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 400 | `INVALID_PHONE` | Receiver phone format invalid |
| 400 | `QUOTE_EXPIRED` | Quote token older than 10 minutes |
| 400 | `QUOTE_INVALID` | Quote token signature verification failed |
| 401 | `UNAUTHORIZED` | No valid cookie |

**Business rules:**
- A unique tracking number is generated (format: `AW-XXXXXX`, 6 alphanumeric chars).
- Order is created with status `PENDING_PAYMENT`.
- The quote token is verified and the amount is locked from the token (not recalculated).
- A PayFast payment session is initiated and the redirect URL is returned.

---

#### `GET /api/orders/mine`

List all orders belonging to the authenticated user, newest first.

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 10 | Items per page (max 50) |

**Success response:** `200 OK` — `PaginatedResponse<Order>`

```json
{
  "data": [ { "...Order" } ],
  "total": 42,
  "page": 1,
  "pageSize": 10
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid cookie |

---

#### `GET /api/orders/track/:trackingNumber`

Public order tracking by tracking number. Returns limited order info and timeline.

| | |
|---|---|
| **Auth** | Public |

**URL params:**

| Param | Type | Description |
|-------|------|-------------|
| `trackingNumber` | string | e.g. `AW-X7K9M2` |

**Success response:** `200 OK` — `TrackOrderResponse`

```json
{
  "order": {
    "trackingNumber": "AW-X7K9M2",
    "status": "IN_TRANSIT",
    "pickupAddress": { "suburb": "Sandton", "city": "Johannesburg" },
    "deliveryAddress": { "suburb": "Centurion", "city": "Pretoria" },
    "parcelDetails": { "size": "MEDIUM" },
    "createdAt": "2026-03-14T08:00:00.000Z"
  },
  "timeline": [
    { "status": "PENDING_PAYMENT", "timestamp": "2026-03-14T08:00:00.000Z" },
    { "status": "CONFIRMED", "timestamp": "2026-03-14T08:01:30.000Z" },
    { "status": "PICKUP_SCHEDULED", "timestamp": "2026-03-14T09:00:00.000Z" },
    { "status": "PICKED_UP", "timestamp": "2026-03-14T10:15:00.000Z", "note": "Collected from reception" },
    { "status": "IN_TRANSIT", "timestamp": "2026-03-14T10:20:00.000Z" }
  ]
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 404 | `ORDER_NOT_FOUND` | No order with this tracking number |

**Business rules:**
- The public tracking response **strips sensitive fields**: `senderId`, `receiverPhone`, full street addresses. Only suburb/city are returned.
- No authentication required — anyone with the tracking number can view status.

---

### Payments

---

#### `POST /api/payments/initiate`

Initiate a PayFast payment for an unpaid order (e.g. retry after failed payment).

| | |
|---|---|
| **Auth** | Requires JWT cookie |

**Request body:** `InitiatePaymentRequest`

```json
{
  "orderId": "uuid"
}
```

**Success response:** `200 OK` — `InitiatePaymentResponse`

```json
{
  "redirectUrl": "https://www.payfast.co.za/eng/process?..."
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing orderId |
| 401 | `UNAUTHORIZED` | No valid cookie |
| 403 | `FORBIDDEN` | Order does not belong to the authenticated user |
| 404 | `ORDER_NOT_FOUND` | Order not found |
| 409 | `DUPLICATE_PAYMENT` | Order is already paid |

**Business rules:**
- Only orders with `paymentStatus: PENDING` or `paymentStatus: FAILED` can be retried.
- The authenticated user must be the order's sender.

---

#### `POST /api/payments/webhook`

PayFast ITN (Instant Transaction Notification) callback.

| | |
|---|---|
| **Auth** | Public (validated by MD5 signature) |

**Request body:** `PayFastPayload`

PayFast sends form-encoded data. The backend parses it into `PayFastPayload`.

**Success response:** `200 OK` (empty body)

**Errors:**

Returns `200` in all cases to prevent PayFast retries. Invalid payloads are logged and discarded.

**Business rules:**
- Validate MD5 signature before any database writes.
- On `COMPLETE` status: set `paymentStatus` to `PAID`, transition order to `CONFIRMED`.
- On `CANCELLED` / `FAILED`: set `paymentStatus` to `FAILED`, order stays `PENDING_PAYMENT`.
- Idempotent — processing the same `pf_payment_id` twice has no effect.
- Send WhatsApp `ORDER_CONFIRMATION` to sender on successful payment.

---

### WhatsApp

---

#### `POST /api/whatsapp/webhook`

Receive delivery status callbacks from the WhatsApp Business API provider.

| | |
|---|---|
| **Auth** | Public (validated by provider signature header) |

**Request body:** Provider-specific payload (varies by WhatsApp BSP).

**Success response:** `200 OK` (empty body)

**Errors:**

Returns `200` in all cases. Invalid payloads are logged and discarded.

**Business rules:**
- Validate the provider's signature header before processing.
- Update the `deliveryStatus` field on the corresponding `WhatsappLog` record.
- Statuses tracked: `sent`, `delivered`, `read`, `failed`.

---

### Admin

---

#### `GET /api/admin/orders`

List all orders in the system with filtering and pagination. Used by the admin dashboard.

| | |
|---|---|
| **Auth** | Requires JWT cookie + `isAdmin: true` |

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 100) |
| `status` | OrderStatus | — | Filter by status |
| `search` | string | — | Search by tracking number or sender phone |

**Success response:** `200 OK` — `PaginatedResponse<Order>`

```json
{
  "data": [ { "...Order" } ],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid cookie |
| 403 | `FORBIDDEN` | User is not an admin |

---

#### `PATCH /api/admin/orders/:id/status`

Update the status of an order. Only valid transitions are allowed.

| | |
|---|---|
| **Auth** | Requires JWT cookie + `isAdmin: true` |

**URL params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Order ID |

**Request body:** `UpdateOrderStatusRequest`

```json
{
  "status": "PICKED_UP",
  "note": "Collected from reception desk"
}
```

**Success response:** `200 OK`

```json
{
  "order": { "...Order (with updated status)" }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_STATUS_TRANSITION` | Transition not allowed (e.g. `DELIVERED → PENDING_PAYMENT`) |
| 400 | `VALIDATION_ERROR` | Invalid status value |
| 401 | `UNAUTHORIZED` | No valid cookie |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `ORDER_NOT_FOUND` | Order not found |

**Business rules:**
- Valid transitions are enforced per the [Order Status Flow](#order-status-flow).
- Each status change creates a new `OrderTimelineEntry`.
- The `note` field is optional and stored in the timeline entry.

---

#### `POST /api/admin/orders/:id/notify`

Send a WhatsApp notification to the sender, receiver, or both.

| | |
|---|---|
| **Auth** | Requires JWT cookie + `isAdmin: true` |

**URL params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Order ID |

**Request body:** `NotifyOrderRequest`

```json
{
  "templateType": "PICKED_UP",
  "recipient": "both"
}
```

**Success response:** `200 OK`

```json
{
  "message": "Notification sent",
  "logs": [ { "...WhatsappLog" } ]
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid template type or recipient value |
| 401 | `UNAUTHORIZED` | No valid cookie |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `ORDER_NOT_FOUND` | Order not found |

**Business rules:**
- `recipient: "sender"` sends to the order's sender phone.
- `recipient: "receiver"` sends to the order's `receiverPhone`.
- `recipient: "both"` sends to both.
- Each message sent creates a `WhatsappLog` record.

---

### System

---

#### `GET /api/health`

Health check endpoint.

| | |
|---|---|
| **Auth** | Public |

**Request body:** None

**Success response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-03-14T10:30:00.000Z"
}
```

**Business rules:**
- Returns `200` if the server is running and can connect to the database.
- Returns `503 Service Unavailable` if the database connection fails.
