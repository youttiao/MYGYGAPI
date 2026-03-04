# GYG Integrator Supplier API Assumptions (MVP)

## Source of truth
- Primary spec: `API-reference/supplier-api-supplier-endpoints.yaml`
- OpenAPI version: `3.0.0`
- API version prefix selected: `/1/`
- Reason: the supplier endpoint spec currently exposes all supplier-side operations under `/1/*` with `info.version: '1.0'`.

## Authentication
- Scheme: HTTP Basic Auth (`components.securitySchemes.BasicAuth`)
- Applied globally in spec (`security: - BasicAuth: []`)
- Implementation decision:
  - Enforce Basic Auth on all `/1/*` endpoints.
  - Return JSON error body on auth failure:
    - `{"errorCode":"AUTHORIZATION_FAILURE","errorMessage":"Invalid credentials"}`
  - HTTP status: `401`
- TODO(configurable): whether to use `401` vs `200` for auth failures if partner certification requires body-only errors in specific flows.

## Required Supplier Endpoints (from spec)

### 1) GET `/1/get-availabilities/`
- Query required:
  - `productId` (string)
  - `fromDateTime` (ISO datetime)
  - `toDateTime` (ISO datetime)
- Success response:
  - `200` + `AvailabilityResponse`
  - shape: `{ "data": { "availabilities": Availability[] } }`
- Availability required fields:
  - `productId`, `dateTime`
  - one of: `vacancies` OR `vacanciesByCategory`
- Optional fields:
  - `cutoffSeconds`, `currency`, `pricesByCategory`, `tieredPricesByCategory`, `openingTimes`
- Error model: `ErrorResponseAvailability`
  - `AUTHORIZATION_FAILURE | INVALID_PRODUCT | VALIDATION_FAILURE | INTERNAL_SYSTEM_FAILURE`

### 2) POST `/1/reserve/`
- Request body required: `ReservationRequest`
- Required (`data`):
  - `productId`, `dateTime`, `bookingItems[]`, `gygBookingReference`
- Optional (`data`):
  - `gygActivityReference`
  - each booking item supports `category`, `count`, optional `groupSize`
- Success response:
  - `200` + `ReservationResponse`
  - required in response: `data.reservationReference`
  - optional: `data.reservationExpiration`
- Error models:
  - `ErrorResponseReservation`
  - `ErrorParticipantSizeConstraint`
  - `ErrorGroupSizeConstraint`

### 3) POST `/1/cancel-reservation/`
- Request body required: `ReservationCancellationRequest`
- Required (`data`):
  - `gygBookingReference`, `reservationReference`
- Optional (`data`):
  - `gygActivityReference`
- Success response:
  - `200` + `EmptySuccessResponse` (`{ "data": {} }`)
- Error model:
  - `ErrorResponseReservationCancellation`

### 4) POST `/1/book/`
- Request body required: `BookingRequest`
- Required (`data`):
  - `productId`, `reservationReference`, `gygBookingReference`, `currency`, `dateTime`, `bookingItems[]`, `travelers[]`, `comment`
- Optional (`data`):
  - `gygActivityReference`, `addonItems[]`, `language`, `travelerHotel`
- Success response:
  - `200` + `BookingResponse`
  - required: `data.bookingReference`, `data.tickets[]`
- Error models:
  - `ErrorResponseBooking`
  - `ErrorParticipantSizeConstraint`
  - `ErrorGroupSizeConstraint`

### 5) POST `/1/cancel-booking/`
- Request body required: `BookingCancellationRequest`
- Required (`data`):
  - `bookingReference`, `gygBookingReference`, `productId`
- Success response:
  - `200` + `EmptySuccessResponse`
- Error model:
  - `ErrorResponseBookingCancellation`
  - includes: `BOOKING_REDEEMED | BOOKING_IN_PAST | BOOKING_ALREADY_CANCELED`

### 6) POST `/1/notify/`
- Request body required: `Notification`
- Required (`data`):
  - `notificationType`, `description`, `supplierName`, `integrationName`, `productDetails`, `notificationDetails`, `dateTime`
- Success response:
  - `200` + `EmptySuccessResponse`
- Notes:
  - This endpoint receives notifications from GYG and is supplier-side ingest.

### 7) GET `/1/products/{productId}/pricing-categories/`
- Path required:
  - `productId`
- Success response:
  - `200` + `PricingCategoriesResponse`

### 8) GET `/1/suppliers/{supplierId}/products/`
- Path required:
  - `supplierId`
- Success response:
  - `200` + `SupplierProductsResponse`
- Error model:
  - `ProductsListErrorResponse` (`INVALID_SUPPLIER` etc.)

### 9) GET `/1/products/{productId}/addons/`
- Path required:
  - `productId`
- Success response:
  - `200` + `AddonsResponse`
- Error model:
  - `AddonsErrorResponse`

### 10) GET `/1/products/{productId}`
- Path required:
  - `productId`
- Success response:
  - `200` + `ProductDetailsResponse`
- Error model:
  - `ProductDetailsErrorResponse`

## Idempotency strategy (implementation assumptions)
- Spec does not define a dedicated idempotency header in this supplier endpoint file.
- Therefore, for write endpoints we use domain keys as idempotency keys:
  - `/1/reserve/`: unique by `gygBookingReference` (and product context in validation)
  - `/1/book/`: unique by `gygBookingReference` and `bookingReference` generated once
  - `/1/cancel-reservation/`: idempotent on `reservationReference`
  - `/1/cancel-booking/`: idempotent on `bookingReference`
- DB-level enforcement:
  - unique constraints + transactions
- TODO(configurable): support explicit header-based idempotency if GYG account rollout provides one.

## Error/HTTP strategy
- Success: always `200` with spec response payload.
- Validation errors: map to `200` with `errorCode=VALIDATION_FAILURE` for business payload violations; framework-level malformed JSON may still return `400`.
- Auth errors: `401` + `AUTHORIZATION_FAILURE` body.
- Not found domain entities: `200` + `INVALID_PRODUCT` / `INVALID_RESERVATION` / `INVALID_BOOKING`.
- Internal failures: `500` fallback with `INTERNAL_SYSTEM_FAILURE` where possible.
- TODO(configurable): certification expectation around always-200 error envelopes vs transport status codes.

## Data modeling assumptions for MVP
- Product internal PK remains UUID, plus external `productId` string used in GYG API.
- Reservation and Booking stored separately to preserve reserve->book lifecycle.
- Store full incoming payload in `rawPayload` (jsonb) for audit/debug.
- Ticket generation for `/1/book/` in MVP: deterministic mock ticket codes.
- Addons and pricing categories are modeled minimally to satisfy endpoint payloads.

## Known spec ambiguities / inconsistencies
- In `NotificationDataProductDetails.required`, spec lists `tourTitle` but property name is `tourOptionTitle`.
  - Assumption: use `tourOptionTitle` in implementation.
  - TODO: confirm with GYG support whether `tourTitle` is a spec typo.
- Error code spelling mismatch observed:
  - description mentions `BOOKING_ALREADY_CANCELLED`
  - enum contains `BOOKING_ALREADY_CANCELED`
  - Assumption: return `BOOKING_ALREADY_CANCELED` (exact enum in schema).

## Missing inputs to confirm with integrator portal
- Final expected behavior for HTTP status codes in negative responses during certification.
- Whether any account-specific idempotency header is required.
- Whether optional `gygActivityReference` should be mandatory for specific product setups.
- Whether webhook signature verification exists for `/1/notify/` in your tenant.
