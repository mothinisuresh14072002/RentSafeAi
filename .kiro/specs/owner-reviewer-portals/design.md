# Design — Owner Portal & Reviewer Portal

## 1. Architecture Overview

Both portals live inside the existing Next.js 16 App Router application at `apps/web`. No new app is introduced. The frontend is a pure client-rendered SPA within Next.js — it uses no server-side data fetching (no `getServerSideProps`, no RSC data fetching) because the API enforces auth via JWT, not session cookies. All data flows through the enhanced `apiClient` singleton.

```
┌─────────────────────────────────────────────────────────────┐
│                        apps/web                             │
│  src/app/                                                   │
│  ├── (auth)/login/page.tsx          ← shared OTP login      │
│  ├── owner/                         ← Owner portal          │
│  │   ├── layout.tsx (shell + guard) │                       │
│  │   └── [feature pages]            │                       │
│  └── reviewer/                      ← Reviewer portal       │
│      ├── layout.tsx (shell + guard) │                       │
│      └── [feature pages]            │                       │
│                                                             │
│  src/lib/                                                   │
│  ├── api-client.ts   ← enhanced fetch wrapper               │
│  ├── auth.ts         ← token storage helpers                │
│  └── formatters.ts   ← paise→₹, date, etc.                 │
│                                                             │
│  src/hooks/                                                 │
│  ├── useAuth.ts                                             │
│  ├── useChecklist.ts                                        │
│  └── [feature hooks]                                        │
│                                                             │
│  src/components/                                            │
│  ├── ui/             ← existing: Button, Card, Badge, Input │
│  └── [feature components]                                   │
└──────────────────────────────────────────────────────────────┘
              │  HTTPS + Bearer JWT
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   apps/api  (NestJS 11)                     │
│  Global prefix: /api/v1                                     │
│  Auth: JwtAuthGuard + RolesGuard + AuditReasonGuard         │
│  DB: PostgreSQL 15 via Prisma 5                             │
│  Queue: BullMQ + Redis 7                                    │
│  Storage: MinIO (S3-compatible)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Route Map

### 2.1 Shared Auth Routes

| Route | Component | Notes |
|---|---|---|
| `/login` | `LoginPage` | Phone entry + OTP step, role-aware redirect |
| `/login/otp` | `OtpPage` | 6-digit code entry, resend countdown |
| `/access-denied` | `AccessDeniedPage` | For role mismatch redirects |

### 2.2 Owner Portal (`/owner/*`)

| Route | Component | Key API calls |
|---|---|---|
| `/owner/dashboard` | `OwnerDashboard` | `GET /owner/checklist`, `GET /notifications/:userId` |
| `/owner/onboarding` | `OnboardingPage` | `PUT /owner/profile`, `POST /kyc/initiate`, `GET /kyc/status` |
| `/owner/profile` | `ProfilePage` | `PUT /owner/profile` |
| `/owner/profile/sessions` | `SessionsPage` | (new endpoint needed) |
| `/owner/profile/privacy` | `PrivacyPage` | `POST /consent/record`, `POST /consent/withdraw`, `POST /privacy/export`, `POST /privacy/delete` |
| `/owner/kyc` | `KycPage` | `POST /kyc/initiate`, `GET /kyc/status` |
| `/owner/bank` | `BankPage` | `GET /bank`, `POST /bank` |
| `/owner/properties` | `PropertiesListPage` | (derived from checklist + listing data) |
| `/owner/properties/new` | `PropertyWizardPage` | `POST /property/register` |
| `/owner/properties/[id]` | `PropertyDetailPage` | property + checklist state |
| `/owner/properties/[id]/documents` | `DocumentsPage` | `POST /storage/upload-request`, `POST /storage/finalize` |
| `/owner/properties/[id]/photos` | `PhotosPage` | same storage flow |
| `/owner/properties/[id]/challenge` | `ChallengePage` | presence challenge flow |
| `/owner/listings/[id]` | `ListingEditorPage` | `POST /listings/property/:id/draft`, `PATCH /listings/:id`, `POST /listings/:id/submit` |
| `/owner/listings/[id]/preview` | `ListingPreviewPage` | read-only tenant view |
| `/owner/viewings` | `ViewingsPage` | viewing lifecycle endpoints |
| `/owner/agreements` | `AgreementsPage` | agreement lifecycle endpoints |
| `/owner/contacts` | `ContactRequestsPage` | `POST /contact/requests/:id/consent` |
| `/owner/payments` | `PaymentsPage` | `GET /payments/owner/summary` |
| `/owner/notifications` | `NotificationsPage` | `GET /notifications/:userId`, `PATCH /notifications/:userId/preferences` |
| `/owner/support` | `SupportPage` | static FAQ + contact link |

### 2.3 Reviewer Portal (`/reviewer/*`)

| Route | Component | Key API calls |
|---|---|---|
| `/reviewer/dashboard` | `ReviewerDashboard` | counts across all queues |
| `/reviewer/kyc` | `KycQueuePage` | `GET /reviewer/kyc/pending` |
| `/reviewer/kyc/[id]` | `KycCasePage` | `POST /reviewer/kyc/:id/decision` |
| `/reviewer/bank` | `BankQueuePage` | `GET /reviewer/bank/pending` |
| `/reviewer/bank/[id]` | `BankCasePage` | `POST /reviewer/bank/:id/decision` |
| `/reviewer/cases` | `PropertyQueuePage` | review case list |
| `/reviewer/cases/[id]` | `PropertyCasePage` | full decision form |
| `/reviewer/fraud` | `FraudReportQueuePage` | `GET /fraud-reports/queue` |
| `/reviewer/fraud/[id]` | `FraudReportCasePage` | `POST /fraud-reports/:id/actions` |
| `/reviewer/signals` | `RiskSignalsPage` | `GET /fraud/signals` |
| `/reviewer/payments` | `PaymentAdminPage` | `GET /payments/admin` |
| `/reviewer/payments/[id]` | `PaymentTimelinePage` | `GET /payments/admin/:id/timeline` |
| `/reviewer/history` | `AuditHistoryPage` | (new endpoint needed) |

---

## 3. Authentication and Session Management

### 3.1 Login Flow (Sequence)

```
User enters phone
  → POST /api/v1/auth/otp/request
  ← 200 { expiresIn: 60 }

User enters 6-digit OTP
  → POST /api/v1/auth/otp/verify  { phone, code }
  ← 200 { accessToken, refreshToken, user: { id, role } }

Client stores:
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  localStorage.setItem('user_role', role)

Redirect based on role:
  OWNER  → /owner/dashboard
  REVIEWER | ADMIN → /reviewer/dashboard
  TENANT → /access-denied (portals not for tenants)
```

### 3.2 Silent Token Refresh (in `apiClient`)

```
Request fails with 401
  → POST /api/v1/auth/otp/refresh  { refreshToken }
  ← 200 { accessToken, refreshToken }  (token rotation)
  → Retry original request with new accessToken
  ← If second 401: clear storage, redirect to /login
```

### 3.3 Route Guards

Each portal shell `layout.tsx` runs a `useAuth()` hook on mount:

```typescript
// Pseudocode
const { role, loading } = useAuth()

if (loading) return <FullPageSpinner />
if (!role) redirect('/login')
if (portal === 'owner' && role !== 'OWNER') redirect('/access-denied')
if (portal === 'reviewer' && role !== 'REVIEWER' && role !== 'ADMIN') redirect('/access-denied')
```

The `useAuth` hook reads from `localStorage` on the client. It does not make an API call on every render — it trusts the stored role until a 401 or logout occurs.

---

## 4. Enhanced API Client

The existing `src/lib/api-client.ts` is extended (not replaced) to support the full portal requirements.

```typescript
// src/lib/api-client.ts  (enhanced interface)

interface RequestOptions extends RequestInit {
  auditReason?: string        // injected as X-Audit-Reason header
  idempotencyKey?: string     // injected as Idempotency-Key header
  skipAuthRefresh?: boolean   // prevents infinite loop during refresh call
}

class ApiClient {
  private async request<T>(path: string, options: RequestOptions): Promise<T>
  // Injects Authorization: Bearer <token>
  // Injects X-Audit-Reason if provided
  // Injects Idempotency-Key if provided
  // On 401: attempts silent refresh (once), then redirects to /login
  // On non-2xx: throws ApiError { status, code, message }

  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string)
}

export const apiClient = new ApiClient()
```

---

## 5. Shared Utilities

### 5.1 `src/lib/formatters.ts`

```typescript
// Paise → ₹ display string
export function formatINR(paise: number): string
// e.g. 1500000 → "₹15,000.00"

// ₹ input → paise for API
export function rupeesToPaise(rupees: number): number
// e.g. 15000 → 1500000

// ISO date → "15 Aug 2026"
export function formatDate(iso: string): string

// ISO date → "15 Aug 2026, 2:30 PM"
export function formatDateTime(iso: string): string

// Remaining days until expiry
export function daysUntilExpiry(iso: string): number
```

### 5.2 `src/lib/auth.ts`

```typescript
export function getAccessToken(): string | null
export function getRefreshToken(): string | null
export function getUserRole(): Role | null
export function storeTokens(access: string, refresh: string, role: Role): void
export function clearTokens(): void
```

### 5.3 `src/hooks/useAuth.ts`

```typescript
interface AuthState {
  role: Role | null
  userId: string | null   // decoded from JWT sub claim
  loading: boolean
}

export function useAuth(): AuthState
```

### 5.4 `src/hooks/useChecklist.ts`

```typescript
// Polls GET /owner/checklist and returns parsed state
export function useChecklist(): {
  data: ChecklistResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}
```

---

## 6. Component Architecture

### 6.1 Shared UI Components (additions to `src/components/ui/`)

These extend the existing `Button`, `Card`, `Badge`, `Input` set.

| Component | Purpose |
|---|---|
| `StatusBadge` | Renders `PublishStatus`, `OwnerState`, `VerificationStatus` with consistent colour mapping |
| `Toast` / `ToastProvider` | Global toast notifications (success, error, info); displays audit log ID on decision success |
| `ConfirmModal` | Two-step confirmation dialog for destructive actions (REJECT, SUSPEND, etc.) |
| `FileUploader` | Presigned URL upload widget: accepts MIME types, size limits, shows quarantine status |
| `SkeletonRow` / `SkeletonCard` | Loading state placeholders |
| `AuditReasonField` | Labelled textarea that validates non-empty before parent form can submit |
| `SandboxBanner` | Persistent "Test / Sandbox Mode" banner — used on KYC, payments, geocoding pages |
| `ReVerificationWarning` | Dismissable (within session) warning banner for critical-change scenarios |
| `MapPin` | Leaflet.js embed (or static map image fallback) showing a single lat/lng pin |
| `MediaLightbox` | Full-screen photo viewer with nav arrows; shows `pHash` similarity badge if near-duplicate |
| `Timeline` | Vertical chronological list used for payment timelines and audit history |
| `Pagination` | Generic page-number controls wired to `page` / `totalPages` from API responses |

### 6.2 Owner Portal Component Tree (key pages)

```
OwnerLayout (shell + guard)
├── TopNav
│   ├── Logo
│   ├── NavLinks [Dashboard, Properties, Viewings, Agreements, Payments, Notifications]
│   └── UserMenu [Profile, Sessions, Privacy, Sign Out, Sign Out All]
└── <Outlet>

OwnerDashboard
├── ReVerificationWarning (conditional)
├── ExpiryWarning (KYC / bank expiry within 30 days)
├── VerificationProgressBar
│   └── VerificationStep × 5 (phone, email, profile, KYC, bank)
├── NotificationBell
└── PropertySummaryCard × N
    ├── AddressBadge
    ├── StatusBadge (PublishStatus)
    └── QuickActions [Manage Listing, View Checklist]

ListingEditorPage
├── ListingEditorForm (auto-saves on debounce)
│   ├── RentInput (₹ → paise)
│   ├── DepositInput
│   ├── FurnishingSelect
│   ├── BedroomCountInput
│   ├── AmenitiesMultiSelect
│   ├── AvailabilityDatePicker
│   └── DescriptionTextarea
├── MediaOrderSorter (drag-and-drop photo reorder)
├── ListingStatusBadge
├── ReviewerFeedbackCard (when CHANGES_REQUESTED)
└── LifecycleActionBar
    ├── SubmitForReviewButton
    ├── MarkRentedButton
    └── ArchiveButton

DocumentsPage
├── DocumentUploadSection × 3 (TITLE_EXTRACT, PROPERTY_TAX, OTHER_EVIDENCE)
│   └── FileUploader (PDF, ≤5 MB)
└── QuarantineStatusPanel

ViewingsPage
├── CalendarView (toggle)
├── ListViewTable
└── ViewingDetailDrawer
    ├── ViewingInfo
    └── ViewingActionBar [Accept, Reschedule, Confirm, Cancel]
```

### 6.3 Reviewer Portal Component Tree (key pages)

```
ReviewerLayout (shell + guard)
├── TopNav (dark slate, "Internal Secure Zone" badge)
│   ├── NavLinks [Dashboard, KYC Queue, Bank Queue, Cases, Fraud, Signals, Payments, Audit]
│   └── UserMenu [Sign Out]
└── <Outlet>

ReviewerDashboard
├── QueueCountCard × 5 (KYC, Bank, Cases, Fraud, Signals — with count badges)
└── RecentDecisionsTable

PropertyCasePage
├── CaseHeader (case ID, days in queue, current state)
├── OwnerIdentitySummary (masked: first name, last initial, ownerState, KYC status)
├── MapAddressComparison
│   ├── AddressTextPanel (structured address)
│   └── MapPin (geocoded pin)
├── DocumentViewer
│   └── PresignedDocumentFrame × N (only CLEARED)
├── PhotoGallery
│   └── MediaLightbox with NearDuplicateWarning
├── OwnerNameMatchIndicator (document extractedFields vs normalizedName)
├── PresenceChallengePanel (photo + coordinates on map)
├── VerificationChecklist (PropertyVerification records)
│   └── ChecklistItem × N with OverrideButton
├── RiskSignalsList
│   └── RiskSignalCard × N (rule code, severity, evidence summary, Resolve button)
├── CaseHistoryTimeline (ReviewAction records)
├── InternalNotesForm
├── AuditHistoryPanel (collapsible, AuditLog records)
└── DecisionPanel
    ├── AuditReasonField (required)
    └── DecisionActionBar
        [Request Changes | Approve | Reject | Suspend | Expire | Reopen | Escalate]
```

---

## 7. State Management Strategy

No external state management library is introduced. State is managed at three levels:

| Level | Mechanism | Used for |
|---|---|---|
| Server/remote state | `useState` + `useEffect` + custom hooks per resource | API data (checklists, listings, queues) |
| UI/ephemeral state | Local `useState` in component | Form fields, modal open/close, loading flags |
| Auth state | `localStorage` + `useAuth` hook | Role, token presence |

For auto-saving in the listing editor, a `useDebounce` hook (500 ms) fires `PATCH /listings/:id` without blocking the user.

---

## 8. File Upload Flow

Every document and photo upload follows this exact sequence to align with the existing Storage module:

```
1. User selects file
   → Validate MIME type and size client-side (fast fail)

2. POST /api/v1/storage/upload-request
   Body: { fileName, contentType, purpose: 'DOCUMENT'|'LISTING_MEDIA' }
   ← { uploadUrl (presigned PUT), objectKey }

3. PUT <uploadUrl>
   Headers: Content-Type = file.type
   Body: file binary
   ← 200 from MinIO (no auth header — presigned URL is self-authorising)

4. POST /api/v1/storage/finalize
   Body: { objectKey, propertyId?, listingId?, documentType?, challengeMetadata? }
   ← { id, quarantineStatus: 'PENDING_SCAN' }

5. UI shows "Scanning…" badge on the record

6. (Async) Malware webhook updates quarantineStatus → CLEARED | INFECTED
   UI reflects status via polling GET /storage/media/:id or next page load
```

The `FileUploader` component encapsulates steps 1–5 and exposes an `onFinalized(record)` callback.

---

## 9. Monetary Amount Handling

All amounts are stored in paise (smallest INR unit) in the API and database.

| Context | Rule |
|---|---|
| Display | `formatINR(paise)` → `₹15,000.00` |
| User input | `<RupeeInput>` component that renders ₹ prefix, stores internal `string`, converts via `rupeesToPaise()` before submitting |
| API response consumption | Always call `formatINR()` before rendering, never display raw paise numbers |
| Validation | Minimum rent = ₹1,000 (100000 paise); validated client-side before API call |

---

## 10. Reviewer Decision Pattern

All reviewer decisions follow the same UI pattern to ensure consistency and prevent accidental submissions.

### Standard Decision (non-destructive, e.g. Approve, Request Changes)
```
1. Reviewer fills AuditReasonField (min 10 chars)
2. Clicks action button → button disables immediately
3. POST /review/cases/:id/decide { action, reason }  +  X-Audit-Reason header
4a. Success → Toast("Decision recorded. Audit ID: abc123") → navigate to queue
4b. Error   → Toast(error.message) → button re-enables
```

### Destructive Decision (REJECT, SUSPEND — two-step)
```
1. Reviewer fills AuditReasonField
2. Clicks REJECT / SUSPEND → ConfirmModal opens
   Modal text: "You are about to [action] this [entity]. This cannot be undone without reopening the case. Are you sure?"
3. Reviewer clicks "Confirm [action]" in modal
4. POST request fires → same success/error flow as above
```

### Escalate (UI-only placeholder)
```
1. Reviewer fills reason
2. Clicks Escalate → writes a ReviewAction with actionTaken = 'ESCALATE' and notes
   (API endpoint for escalation to be added; for now appended as a note)
```

---

## 11. Re-verification Warning System

The warning system operates at two layers:

### Layer 1 — Pre-change Modal (Owner Portal)
Triggered before saving a critical field change (phone, email, primary bank, KYC re-initiation).

```
Component: <CriticalChangeModal>
Props: field, impactDescription, onConfirm, onCancel

impactDescription map:
  phone  → "All active sessions will be revoked. KYC must be re-initiated. Your published listings will be paused until KYC is approved again."
  email  → "Email verification will be required before this change takes effect."
  bank   → "Listing payouts will be paused until your new account passes verification."
  kyc    → "Your listings will move to Under Review until the new KYC check is approved."
```

### Layer 2 — Dashboard Banner (persistent until resolved)
```
Component: <ReVerificationWarning>
Visibility logic: shown when ownerState !== 'VERIFIED' OR bank.status !== 'VERIFIED'
Content: lists the specific unverified fields with links to fix them
Dismissable: no (not dismissable — it disappears only when all fields resolve)
```

---

## 12. Risk Signal Evidence Rendering

`evidenceJson` from `RiskSignal` is a free-form JSON field. The portal renders it using a deterministic rule:

```typescript
// src/components/reviewer/EvidenceRenderer.tsx
// Renders evidenceJson in a human-readable panel, not raw JSON

// Known evidence shapes by ruleCode prefix:
// "DUP_IMAGE_*" → { mediaIdA, mediaIdB, similarityScore, pHashA, pHashB }
//   → renders MediaComparison component (side-by-side + score bar)
// "NAME_MISMATCH_*" → { submittedName, kycName, levenshteinDistance }
//   → renders name comparison table
// "ADDR_MISMATCH_*" → { submittedAddress, geocodedAddress, distanceMeters }
//   → renders address diff table
// "SUSPICIOUS_ACTIVITY_*" → { description, relatedEntityIds[] }
//   → renders narrative + entity links
// fallback → renders key-value table from the JSON object
```

---

## 13. Map Integration

The property address/map comparison uses **Leaflet.js** (open-source, no API key required) with OpenStreetMap tiles.

```
Package: leaflet + react-leaflet (to be added to apps/web package.json)

Component: <MapPin lat={number} lng={number} label={string} />
  - Renders a 400×300 Leaflet map centred on lat/lng
  - Single marker with label tooltip
  - Zoom controls enabled
  - For the reviewer presence-challenge view: renders TWO markers
    (property pin in blue, challenge submission pin in red)
    with a line connecting them and distance label

Fallback: if coordinates are null/undefined → renders a grey placeholder box
  "Map unavailable — coordinates not geocoded"
```

---

## 14. Notification Bell

```
Component: <NotificationBell userId={string} />
  - Polls GET /notifications/:userId every 60 seconds
  - Shows unread count badge (capped at "99+")
  - Opens a slide-in drawer with <NotificationList>
    - Each item: title, body, timestamp, read/unread dot
    - Clicking an item → marks read (PATCH /notifications/:userId)
      and navigates to deepLink if present
  - "View All" link → /owner/notifications
  - "Preferences" link → /owner/notifications#preferences
```

---

## 15. Audit History Endpoint Gap

The Reviewer portal's Audit History page (`/reviewer/history`) requires a paginated, filtered query of `AuditLog` records. This endpoint does not currently exist in the API.

**Required new endpoint** (to be implemented in task phase):
```
GET /api/v1/audit/logs
  Query params: action?, entityType?, actorRole?, from?, to?, page, pageSize
  Auth: REVIEWER | ADMIN
  Response: { data: AuditLog[], total, page, pageSize }
```

A new `AuditController` must be added to `apps/api/src/common/audit/`, exposing this endpoint and protected by `RolesGuard([REVIEWER, ADMIN])`.

---

## 16. Sessions Endpoint Gap

The Owner portal's Sessions page (`/owner/profile/sessions`) requires listing the user's active sessions. This endpoint does not currently exist.

**Required new endpoint**:
```
GET /api/v1/auth/sessions
  Auth: any authenticated user (own sessions only)
  Response: { sessions: [{ id, deviceId, createdAt, lastUsedAt, status }] }

DELETE /api/v1/auth/sessions/:id
  Auth: own session only
  Effect: sets session status to REVOKED
```

These are small additions to `AuthController` and `AuthService`.

---

## 17. Property Identifier Reviewer Endpoint Gap

`PropertyIdentifier` values are stored encrypted. The reviewer needs to view decrypted values during a case review. A reviewer-scoped endpoint must expose them:

**Required new endpoint**:
```
GET /api/v1/review/property/:propertyId/identifiers
  Auth: REVIEWER | ADMIN
  Response: { identifiers: [{ type, value }] }  // decrypted values
```

This requires the `ReviewModule` to call the encryption service to decrypt and return values, with the access audited.

---

## 18. Environment Configuration

The port mismatch (API: 3000, web client defaults to 3001) is fixed by aligning both `.env` files:

```bash
# apps/api/.env
PORT=3001

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

No code change is needed — both sides already read from environment variables.

---

## 19. New Dependencies (apps/web)

| Package | Version | Purpose |
|---|---|---|
| `leaflet` | `^1.9.4` | Map rendering |
| `react-leaflet` | `^4.2.1` | React wrapper for Leaflet |
| `@types/leaflet` | `^1.9.14` | TypeScript types |
| `@dnd-kit/core` | `^6.1.0` | Drag-and-drop for photo reorder |
| `@dnd-kit/sortable` | `^8.0.0` | Sortable list primitive |

All versions pinned. No UI framework (shadcn, MUI) is introduced — the existing custom Tailwind component system is extended.

---

## 20. Security Considerations

| Concern | Mitigation |
|---|---|
| Token storage in localStorage | Acceptable for this web-portal threat model; access tokens are short-lived (15 min); refresh tokens rotate on use and detect reuse |
| PII in reviewer views | Owner identity shown only as masked fields from `maskedResult`; full PII never rendered client-side |
| Document access | Presigned download URLs are 15-minute time-limited; only `CLEARED` files served |
| Double submission | All mutating buttons are disabled while an API call is in flight |
| CSRF | Not applicable — API uses Bearer JWT, not cookies |
| Reviewer role enforcement | Enforced on the API via `RolesGuard`; client-side guard is defence-in-depth only |
| Audit reason enforcement | `AuditReasonField` must be non-empty before form submits; API enforces via `AuditReasonGuard` |
| Sandbox clarity | All sandbox-mocked flows show persistent `<SandboxBanner>` — no accidental production confusion |
