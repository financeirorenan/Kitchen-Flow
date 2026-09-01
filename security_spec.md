# Security Specification & Threat Model (ABAC Multi-Tenant Zero-Trust)

## 1. Context & Architecture Invariants
- **Multi-Tenant Hierarchy**: `User -> Tenant -> Store -> Resource (Order, Product, Cash, Finance, Fiscal) -> Permission`
- **Identity Invariant**: Every write must carry the authenticating caller's UID and match their assigned `tenantId` (unless the user has global `SAAS_ADMIN` role).
- **Tenant Isolation Invariant**: No authenticated user belonging to Tenant A can read, write, update, delete, or reprint records belonging to Tenant B under any circumstance.
- **Marketplace Isolation Invariant**: When placing an order on Marketplace, the order is tagged with the target `tenantId`. External systems polling for events (Saipos / ERP) must strictly receive events where `event.tenantId == caller.tenantId`.

---

## 2. The "Dirty Dozen" Threat Scenarios & Attack Payloads

| ID | Attack Vector / Threat | Target Collection / Endpoint | Description / Payload | Expected Security Result |
|---|---|---|---|---|
| **DD-01** | Cross-Tenant Read (IDOR) | `orders/{orderId_B}` | User from `tenant_A` attempts to read an order belonging to `tenant_B`. | **403 FORBIDDEN / PERMISSION_DENIED** |
| **DD-02** | Cross-Tenant Write Injection | `products/{prodId}` | User from `tenant_A` sends write with payload `{ tenantId: "tenant_B" }`. | **403 FORBIDDEN / PERMISSION_DENIED** |
| **DD-03** | Tenant ID Poisoning on Update | `orders/{orderId_A}` | User from `tenant_A` modifies `tenantId: "tenant_B"` in an update payload. | **400 / 403 REJECTED** (Immutable `tenantId`) |
| **DD-04** | Role Escalation on Profile | `users/{uid}` | Non-admin user attempts to update own role to `SAAS_ADMIN` or `OWNER`. | **PERMISSION_DENIED** |
| **DD-05** | Marketplace Polling Leak | `GET /api/v1/marketplace/events:poll` | Merchant B polls events without filters or with Merchant A's header. | **Isolates to caller's tenant only; zero leak** |
| **DD-06** | Cross-Tenant Event ACK | `POST /api/v1/marketplace/events/ack` | Merchant B sends `{ eventIds: ["evt_tenant_A_123"] }`. | **ACK rejected for cross-tenant event** |
| **DD-07** | Marketplace Order Status IDOR | `POST /api/v1/marketplace/orders/:orderId/cancel` | Merchant B tries to cancel order belonging to Merchant A. | **403 FORBIDDEN** |
| **DD-08** | Catalog Tampering IDOR | `PATCH /api/v1/marketplace/catalog/items/:itemId` | Merchant B modifies price/availability of Merchant A's product. | **403 FORBIDDEN** |
| **DD-09** | Fiscal Document Cross-Tenant Reprint | `POST /api/fiscal/reprint` | Tenant B requests reprint of Tenant A's NFC-e. | **403 FORBIDDEN** |
| **DD-10** | Unauthenticated Event Polling | `GET /api/v1/marketplace/events:poll` | Request without `x-merchant-id` or `tenantId`. | **401 UNAUTHORIZED** |
| **DD-11** | Stale Session Bleed on Logout | `localStorage / sessionStorage` | User logs out of Tenant A and another user logs in on same browser. | **All tenant keys flushed; clean state** |
| **DD-12** | Cash Closing / Financial Tampering | `financial_records` / `cash_closings` | Low-permission role (e.g., WAITER/COURIER) attempts to write financial records. | **PERMISSION_DENIED** |
