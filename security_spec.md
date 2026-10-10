# Security Specification & Threat Model (ABAC Multi-Tenant Zero-Trust)

## 1. Context & Architecture Invariants
- **Multi-Tenant Hierarchy**: `User -> Tenant -> Store -> Resource (Order, Product, Cash, Finance, Fiscal) -> Permission`
- **Authentication Invariant**: Every operational read/write in Firestore (`orders`, `financialRecords`, `cashClosings`, `customers`, `diningTables`, `rawMaterials`, `bankAccounts`, `couriers`, `auditLogs`, `fiscal_documents`, `integration_events`, `users`) requires a verified Firebase Authentication token (`request.auth != null && request.auth.uid != null`). Local browser fallback sessions (`localStorage` / `IndexedDB` / `kitchenflow_demo_user`) NEVER authorize remote Firestore synchronization.
- **Tenant Isolation Invariant**: No authenticated user belonging to Tenant A (`getUserTenantId() == 'tenant_A'`) can read, list, create, update, or delete records belonging to Tenant B (`resource.data.tenantId == 'tenant_B'`) under any circumstance.
- **Role-Based Access Control (RBAC) Invariant**:
  - `SAAS_ADMIN`: Global platform governance (`tenants`, `plans`, `saasLedger`, `saasPayments`, `leads`, `tickets`, `commerceCategories`).
  - `OWNER` / `ADMIN` / `MANAGER`: Full management of their assigned `tenantId` (`products`, `settings`, `users`, `financialRecords`, `cashClosings`, `fiscal_documents`, `rawMaterials`, `bankAccounts`).
  - `CASHIER`: Can read/write `orders`, `diningTables`, `customers`, `financialRecords`, `cashClosings`, `fiscal_documents` strictly within their `tenantId`, but cannot modify `users` roles or global `tenants`.
  - `WAITER`: Can read `products`, read/write `orders` and `diningTables` within their `tenantId`, and CANNOT read or write `financialRecords`, `cashClosings`, `bankAccounts`, or `users`.
  - `CHEF` / `KDS`: Can read/update `orders` status and read `products`/`rawMaterials` within their `tenantId`, and CANNOT read or write `financialRecords`, `cashClosings`, or `users`.
  - `COURIER`: Can read/update their own `couriers/{courierId}` document and orders assigned to them (`resource.data.courierId == request.auth.uid`), and create delivery commission entries in `financialRecords` strictly for their assigned `tenantId`.
- **Zero Plaintext Credentials Invariant**: Documents written to `users` or `couriers` MUST NEVER contain a `password` field (`!('password' in request.resource.data)`).

---

## 2. The "Dirty Dozen" Threat Scenarios & Attack Payloads

| ID | Attack Vector / Threat | Target Collection / Operation | Malicious Payload / Context | Expected Security Result |
|---|---|---|---|---|
| **DD-01** | Unauthenticated Read / Scrape | `orders`, `customers`, `financialRecords`, `users` | `auth = null` attempts `get` or `list` on operational collections. | **PERMISSION_DENIED** |
| **DD-02** | Unauthenticated Write Injection | `orders/{orderId}`, `products/{prodId}` | `auth = null` attempts `create` or `update` without token. | **PERMISSION_DENIED** |
| **DD-03** | Cross-Tenant Read (IDOR) | `orders/{orderId_B}`, `financialRecords/{fin_B}` | Authenticated user from `tenant_A` attempts to read document with `tenantId: "tenant_B"`. | **PERMISSION_DENIED** |
| **DD-04** | Cross-Tenant Write Injection | `products/{prodId}`, `orders/{orderId}` | Authenticated user from `tenant_A` sends `create` with `{ tenantId: "tenant_B" }`. | **PERMISSION_DENIED** |
| **DD-05** | Tenant ID Poisoning on Update | `orders/{orderId_A}` | Authenticated user from `tenant_A` attempts `update` changing `tenantId` from `"tenant_A"` to `"tenant_B"`. | **PERMISSION_DENIED** (Immutable `tenantId`) |
| **DD-06** | Self-Assigned Privilege Escalation | `users/{uid}` | Authenticated `WAITER` or `CUSTOMER` attempts `update` on own profile with `{ role: "SAAS_ADMIN" }` or `{ role: "OWNER" }`. | **PERMISSION_DENIED** |
| **DD-07** | Plaintext Password Persistence | `users/{uid}`, `couriers/{cid}` | Any user attempts `create` or `update` containing `{ password: "Secret123!" }`. | **PERMISSION_DENIED** |
| **DD-08** | RBAC Violation: Waiter Accessing Finance | `financialRecords`, `cashClosings` | Authenticated `WAITER` from `tenant_A` attempts `read` or `create` on `financialRecords` of `tenant_A`. | **PERMISSION_DENIED** |
| **DD-09** | RBAC Violation: Courier Reading Unassigned Orders | `orders/{orderId}` | Authenticated `COURIER` attempts to read or update an order from another courier or another tenant. | **PERMISSION_DENIED** |
| **DD-10** | RBAC Violation: Non-Admin Modifying SaaS Plans/Ledger | `plans/{planId}`, `saasLedger/{id}` | Authenticated `OWNER` of `tenant_A` attempts to write to `plans` or `saasLedger`. | **PERMISSION_DENIED** |
| **DD-11** | Offline Local Session Sync Bypass | `orders`, `settings`, `products` | Browser has `localStorage.kitchenflow_demo_user` (`isLocalSession: true`) but `request.auth == null`. | **Blocked at client sync gate AND rejected by Firestore Rules (`PERMISSION_DENIED`)** |
| **DD-12** | Cross-Tenant Marketplace Polling / Fiscal Reprint | `/api/v1/marketplace/events:poll`, `/api/fiscal/reprint` | `tenant_B` attempts to poll events or reprint fiscal NFC-e belonging to `tenant_A`. | **403 FORBIDDEN / Isolated** |
