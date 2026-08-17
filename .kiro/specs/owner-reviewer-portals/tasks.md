# Tasks — Owner Portal & Reviewer Portal

Implementation is organised into eight phases. Each phase is independently shippable and builds on the previous. Tasks within a phase may be parallelised unless a dependency is noted.

---

## Phase 0 — Foundation (blockers for everything else)

### Task 0.1 — Fix port alignment
**Files**: `apps/api/.env`, `apps/web/.env.local`  
**Work**:
- Set `PORT=3001` in `apps/api/.env` (and `.env.example`).
- Confirm `NEXT_PUBLIC_API_URL=http://localhost:3001` in `apps/web/.env.local` (and `.env.example`).
- Verify the Turbo `dev` task still starts both apps without conflict.

**Acceptance**: `apps/api` starts on port 3001; the web client's default API URL resolves correctly.

---

### Task 0.2 — Enhance API client
**File**: `apps/web/src/lib/api-client.ts`  
**Work**:
- Refactor the existing fetch wrapper into a class `ApiClient` with typed methods: `get`, `post`, `patch`, `put`, `delete`.
- Add `RequestOptions` interface supporting `auditReason?: string`, `idempotencyKey?: string`, `skipAuthRefresh?: boolean`.
- Inject `Authorization: Bearer <token>` from `localStorage`.
- Inject `X-Audit-Reason` header when `auditReason` is provided.
- Inject `Idempotency-Key` header when `idempotencyKey` is provided.
- Implement silent token refresh: on 401, call `POST /auth/otp/refresh`, store new tokens, retry the original request once. On second 401, clear tokens and redirect to `/login`.
- Export `ApiError` class with `status`, `code`, `message` fields.
- Export singleton `apiClient`.

**Acceptance**: All existing page components that call `apiClient` continue to work; a 401 triggers a refresh cycle and retries; a failed refresh redirects to `/login`.

---

### Task 0.3 — Auth helpers and `useAuth` hook
**Files**: `apps/web/src/lib/auth.ts` (new), `apps/web/src/hooks/useAuth.ts` (new)  
**Work**:
- `auth.ts`: implement `getAccessToken`, `getRefreshToken`, `getUserRole`, `storeTokens`, `clearTokens` reading/writing `localStorage`.
- Decode `userId` from the JWT `sub` claim without a library (base64 decode the payload segment).
- `useAuth.ts`: `useState` + `useEffect` that reads `localStorage` on mount and returns `{ role, userId, loading }`.

**Acceptance**: `useAuth()` returns the correct role synchronously after mount; returns `null` role when no token is stored.

---

### Task 0.4 — Shared utility: formatters
**File**: `apps/web/src/lib/formatters.ts` (new)  
**Work**:
- `formatINR(paise: number): string` — divides by 100, formats with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- `rupeesToPaise(rupees: number): number` — multiplies by 100, rounds to integer.
- `formatDate(iso: string): string` — "15 Aug 2026".
- `formatDateTime(iso: string): string` — "15 Aug 2026, 2:30 PM".
- `daysUntilExpiry(iso: string): number` — positive = days remaining, negative = already expired.

**Acceptance**: Each function returns the documented format; `formatINR(1500000)` returns `"₹15,000.00"`; `rupeesToPaise(15000)` returns `1500000`.

---

### Task 0.5 — Shared UI components (foundation set)
**File**: `apps/web/src/components/ui/` (additions)  
**Work**:
- `Toast` + `ToastProvider` — renders a stack of dismissable toasts in the top-right; variants: success (green), error (red), info (blue); auto-dismiss after 5 s; supports `auditId` prop that appends "Audit ID: <id>" to the message.
- `ConfirmModal` — accessible modal with title, body, primary action label, cancel button; traps focus; closes on Escape.
- `SkeletonRow` — animated grey bar, configurable width/height.
- `SkeletonCard` — card-shaped skeleton.
- `AuditReasonField` — labelled `<textarea>` with min-length validation (10 chars); exposes `isValid` state to parent.
- `SandboxBanner` — sticky yellow bar: "⚠ Sandbox / Test Mode — no real data or money is involved".
- `ReVerificationWarning` — amber banner listing unverified fields with anchor links; non-dismissable.
- `Pagination` — page-number strip; props: `page`, `totalPages`, `onPageChange`.

**Acceptance**: Each component renders correctly in isolation; `ConfirmModal` closes on Escape; `AuditReasonField` disables sibling submit button when empty.

---

### Task 0.6 — Install new frontend dependencies
**File**: `apps/web/package.json`  
**Work**:
- Add `"leaflet": "^1.9.4"`, `"react-leaflet": "^4.2.1"`, `"@types/leaflet": "^1.9.14"`.
- Add `"@dnd-kit/core": "^6.1.0"`, `"@dnd-kit/sortable": "^8.0.0"`.
- Run `pnpm install` from the workspace root.
- Add Leaflet CSS import to `apps/web/src/app/globals.css`: `@import 'leaflet/dist/leaflet.css';`.
- Add a `MapPin` component stub at `apps/web/src/components/ui/MapPin.tsx` using `dynamic(() => import(...), { ssr: false })` to avoid SSR issues.

**Acceptance**: `pnpm build` completes without errors; the `MapPin` stub renders without crashing.

---

### Task 0.7 — API gap: sessions endpoints
**Files**: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`  
**Work**:
- Add `GET /auth/sessions` — queries `Session` table filtered by `userId` (from JWT), returns `{ id, deviceId, createdAt, lastUsedAt, status }` for non-revoked sessions. Protected by `JwtAuthGuard`.
- Add `DELETE /auth/sessions/:id` — sets session `status = REVOKED` where `id` matches AND `userId` matches (prevent cross-user revocation). Writes `AuditLog` entry.

**Acceptance**: Authenticated `GET /auth/sessions` returns only the caller's sessions; `DELETE` revokes the target session and returns 204.

---

### Task 0.8 — API gap: audit log query endpoint
**Files**: `apps/api/src/common/audit/audit.controller.ts` (new), `apps/api/src/common/audit/audit.module.ts` (update), `apps/api/src/app.module.ts`  
**Work**:
- Create `AuditController` with `GET /audit/logs`.
- Query params: `action?`, `entityType?`, `actorRole?`, `from?`, `to?`, `page` (default 1), `pageSize` (default 20, max 100).
- Protected by `JwtAuthGuard` + `RolesGuard([REVIEWER, ADMIN])`.
- Returns `{ data: AuditLog[], total, page, pageSize }` — never exposes `ipDeviceReference` in the response body (strip it server-side).
- Register the controller in `AuditModule` and import `AuditModule` into `AppModule` (if not already global).

**Acceptance**: `GET /audit/logs?entityType=LISTING&page=1&pageSize=20` returns paginated records; non-reviewer role returns 403.

---

### Task 0.9 — API gap: property identifier reviewer endpoint
**Files**: `apps/api/src/review/review.controller.ts`, `apps/api/src/review/review.service.ts`  
**Work**:
- Add `GET /review/property/:propertyId/identifiers`.
- Protected by `RolesGuard([REVIEWER, ADMIN])`.
- Decrypts `PropertyIdentifier.encryptedValue` for each identifier belonging to the property using the existing encryption service.
- Writes an `AuditLog` entry for the access (action: `PROPERTY_IDENTIFIERS_VIEWED`).
- Returns `{ identifiers: [{ id, type, value }] }`.

**Acceptance**: Returns decrypted identifier values for a valid propertyId; access is logged; non-reviewer gets 403.

---

## Phase 1 — Shared Authentication UI

### Task 1.1 — Login page (phone entry)
**File**: `apps/web/src/app/(auth)/login/page.tsx` (new route group)  
**Work**:
- Phone number input with `+91` prefix, validated with a simple 10-digit regex before submitting.
- On submit: calls `POST /auth/otp/request`, stores phone in session state, navigates to `/login/otp`.
- Error handling: show inline error if rate-limited (429) or invalid phone (400).
- "Resend OTP" not available on this page (available on OTP page).
- Fully keyboard-navigable; labelled for screen readers.

**Acceptance**: Valid phone navigates to OTP page; invalid phone shows inline error; 429 shows "Please wait 60 seconds" message.

---

### Task 1.2 — OTP verification page
**File**: `apps/web/src/app/(auth)/login/otp/page.tsx`  
**Work**:
- 6-digit OTP input (single input or 6 separate digit boxes — implementation choice).
- Countdown timer (60 s) with "Resend OTP" button that re-calls `POST /auth/otp/request`.
- On submit: calls `POST /auth/otp/verify`, stores tokens via `storeTokens()`, redirects based on role:
  - `OWNER` → `/owner/dashboard`
  - `REVIEWER` | `ADMIN` → `/reviewer/dashboard`
  - Other → `/access-denied`
- Error: "Invalid code" on wrong OTP; "Too many attempts" on max-attempts error (lock out, show support link).

**Acceptance**: Correct OTP redirects to the role-appropriate dashboard; wrong OTP shows inline error without navigating; countdown reaches 0 and enables Resend.

---

### Task 1.3 — Route guards (layout updates)
**Files**: `apps/web/src/app/owner/layout.tsx`, `apps/web/src/app/reviewer/layout.tsx`  
**Work**:
- Replace the existing TODO comment with a real `useAuth()` call.
- Owner layout: redirect to `/login` if no token; redirect to `/access-denied` if role is not `OWNER`.
- Reviewer layout: redirect to `/login` if no token; redirect to `/access-denied` if role is not `REVIEWER` or `ADMIN`.
- Show `<FullPageSpinner />` while `loading === true` to avoid flash of protected content.

**Acceptance**: Visiting `/owner/dashboard` without a token redirects to `/login`; logged in as a tenant redirects to `/access-denied`; logged in as an owner renders the page.

---

### Task 1.4 — Access denied page
**File**: `apps/web/src/app/access-denied/page.tsx` (new)  
**Work**:
- Simple page: "You don't have permission to view this page." with a link to `/login`.
- No nav shell — standalone page.

---

## Phase 2 — Owner Portal: Verification Flows

### Task 2.1 — Owner dashboard (full implementation)
**File**: `apps/web/src/app/owner/dashboard/page.tsx`  
**Work**:
- Fetch `GET /owner/checklist` on mount; derive progress bar state from `{ hasProfile, isPhoneVerified, isEmailVerified, ownerState, canSubmitProperty }`.
- Render `VerificationProgressBar` with 5 steps, each linking to the relevant sub-page.
- Fetch properties list (needs API — use existing data from checklist or add a `GET /property` owner endpoint if not present; document the gap if missing).
- Render `PropertySummaryCard` per property with `StatusBadge` and quick links.
- Render `<NotificationBell>` component.
- Render `<ReVerificationWarning>` when `ownerState !== 'VERIFIED'` (and at least one property exists).
- Render expiry warning when KYC `daysUntilExpiry < 30`.

**Acceptance**: Dashboard shows correct step completion state; clicking an incomplete step navigates to the correct page; banner appears when ownerState is not VERIFIED.

---

### Task 2.2 — Profile page
**File**: `apps/web/src/app/owner/profile/page.tsx`  
**Work**:
- Form with fields: `firstName`, `lastName`, `displayName`, `email` — pre-populated from existing profile data.
- `email` change triggers `<CriticalChangeModal>` with email-specific impact description before saving.
- Phone number section: shows current verified phone (read-only display). "Change phone number" opens a flow that calls `POST /auth/otp/request` with the new number, then requires OTP confirmation; triggers `<CriticalChangeModal>` with phone-specific impact description first.
- `ownerState` displayed as read-only `<StatusBadge>`.
- Save calls `PUT /owner/profile`.
- Show success toast on save.

**Acceptance**: Form saves correctly; phone change modal shows before any API call; after phone change, `<ReVerificationWarning>` appears on dashboard.

---

### Task 2.3 — KYC page
**File**: `apps/web/src/app/owner/kyc/page.tsx`  
**Work**:
- Fetch `GET /kyc/status` on mount; render state-aware UI based on `ownerState`:
  - `KYC_PENDING`: "Start KYC" button → calls `POST /kyc/initiate` → shows sandbox link returned.
  - `KYC_REVIEW`: "Under Review" message with estimated timeframe.
  - `VERIFIED`: success state with verified date, expiry date, expiry warning if < 30 days.
  - `REJECTED`: rejection reason from `maskedResult`, "Re-initiate KYC" button (triggers `<CriticalChangeModal>` first).
- `<SandboxBanner>` always visible.

**Acceptance**: Each `ownerState` renders the correct UI branch; "Start KYC" is only shown when in `KYC_PENDING` state.

---

### Task 2.4 — Bank accounts page
**File**: `apps/web/src/app/owner/bank/page.tsx`  
**Work**:
- Fetch `GET /bank`; list accounts with: masked account number, beneficiary name, `StatusBadge`, primary indicator.
- "Add Bank Account" form: account number, IFSC, account holder name. Note: "Name must match your KYC name."
- Submit calls `POST /bank`. On `NEEDS_REVIEW` response: show "Pending manual review" notice. On `REJECTED`: show reason.
- Adding/changing a primary bank account triggers `<CriticalChangeModal>` with bank-specific impact description.
- `<SandboxBanner>` visible.

**Acceptance**: Accounts list renders; form submits and shows appropriate status; critical change modal fires when a new primary account is added.

---

## Phase 3 — Owner Portal: Property and Listing

### Task 3.1 — Property registration wizard
**File**: `apps/web/src/app/owner/properties/new/page.tsx` (update existing stub)  
**Work**:
- Step 1: Property type selector (4 types as cards with icons).
- Step 2: Address form — door number, street name, area, locality dropdown (fetch from `/property/localities` or use hardcoded Chennai whitelist), pin code. All fields required.
- Step 3: Map confirmation — render `<MapPin>` with coordinates returned by the API (geocoding happens server-side during `POST /property/register`). "Does this pin match?" → Confirm / Adjust. If Adjust: allow free-text correction and resubmit.
- On conflict (409): display "A property at this address is already registered."
- On success: navigate to `/owner/properties/[id]/documents`.
- Gated by `canSubmitProperty`; if false, show disabled state with tooltip.

**Acceptance**: Wizard progresses through 3 steps; map shows geocoded pin; address conflict shows appropriate error; navigation to documents on success.

---

### Task 3.2 — Document uploads page
**File**: `apps/web/src/app/owner/properties/[id]/documents/page.tsx` (new)  
**Work**:
- Three upload sections: TITLE_EXTRACT, PROPERTY_TAX, OTHER_EVIDENCE.
- Each uses `<FileUploader>` component (PDF, ≤5 MB).
- `FileUploader` encapsulates the full three-step presigned URL flow (Task 0.6 already adds the component stub — implement the full logic here).
- Show quarantine status per file: Scanning / Cleared / Infected.
- Infected files show error + "Remove and re-upload" prompt.
- "Continue to Photos" button enabled only when ≥ 1 document is `CLEARED`.

**Acceptance**: File uploads successfully via presigned URL flow; quarantine status reflects API state; infected file shows error; navigation blocked until minimum uploads met.

---

### Task 3.3 — Photo uploads page
**File**: `apps/web/src/app/owner/properties/[id]/photos/page.tsx` (new)  
**Work**:
- Grid upload area for up to 12 photos (JPG/PNG/WEBP, ≤10 MB each).
- Same `<FileUploader>` flow as documents but with `purpose: 'LISTING_MEDIA'`.
- Drag-and-drop reorder using `@dnd-kit/sortable`; on reorder, call `PATCH /listings/:id` with updated `mediaOrder` array.
- Show quarantine status per photo.
- "Continue to Presence Challenge" button enabled when ≥ 3 photos are `CLEARED`.

**Acceptance**: Photos upload and display in a grid; drag reorder persists to the API; navigation blocked until minimum cleared photos.

---

### Task 3.4 — Presence challenge page
**File**: `apps/web/src/app/owner/properties/[id]/challenge/page.tsx` (new)  
**Work**:
- Fetch active `PresenceChallenge` record for the property.
- Display: challenge phrase (large, prominent text), expiry countdown timer.
- Instructions: "Take a photo at the property holding a visible sign showing this phrase."
- Photo upload widget (single photo): same presigned URL flow with `challengeMetadata` in finalize call.
- After upload: show submitted photo thumbnail and "Submitted — awaiting review" state.
- If no active challenge or challenge expired: show "Request New Challenge" button (calls API endpoint when available; show "coming soon" placeholder if endpoint is not yet implemented).

**Acceptance**: Challenge phrase and countdown render; photo uploads successfully; submitted state displays after upload.

---

### Task 3.5 — Verification checklist widget
**File**: `apps/web/src/components/owner/VerificationChecklist.tsx` (new)  
**Work**:
- Accepts `checklist` (from `GET /owner/checklist`) and `propertyVerifications` (list of `PropertyVerification` records from a new `GET /property/:id/verifications` endpoint or derived from case data).
- Renders a list of checklist items: Owner KYC, Bank Verified, Ownership Document, Photos, Presence Challenge, Address Confirmed.
- Each item: status icon (✓ green / ⏳ in-progress / ✗ action-required / — not-started), label, status text, link if action required.
- Used as a sidebar widget on `PropertyDetailPage` and `ListingEditorPage`.

**Acceptance**: All six checklist items render with the correct status derived from API data; "Action Required" items have working links.

---

### Task 3.6 — Listing editor page
**File**: `apps/web/src/app/owner/listings/[id]/page.tsx` (new)  
**Work**:
- If no listing exists for the property, show "Create Listing" CTA that calls `POST /listings/property/:propertyId/draft` and navigates to the new listing.
- Form fields: rent (₹ input → paise), deposit (₹ input → paise), furnishing select, bedroom count, amenities multi-select, available-from date picker, description textarea.
- Auto-save: `useDebounce(500)` triggers `PATCH /listings/:id` on any field change; show "Saving…" / "Saved" indicator.
- Photo reorder (same drag-and-drop as Task 3.3, reused here).
- `<VerificationChecklist>` widget in sidebar.
- `<ReviewerFeedbackCard>` shown when `lifecycleState === CHANGES_REQUESTED` (renders `ReviewAction.notes`).
- `LifecycleActionBar`: Submit for Review / Mark Rented / Archive buttons with correct visibility rules (R-OWN-12).
- Current `lifecycleState` displayed as prominent `<StatusBadge>`.

**Acceptance**: Form auto-saves; paise/rupee conversion is correct; feedback card shows reviewer notes; action buttons follow visibility rules.

---

### Task 3.7 — Listing preview page
**File**: `apps/web/src/app/owner/listings/[id]/preview/page.tsx` (new)  
**Work**:
- Render the listing as a tenant would see it, using `publishedVersion` snapshot data.
- Read-only; no edit controls.
- "Back to Editor" link.
- `<SandboxBanner>` if in sandbox context.

**Acceptance**: Preview renders all listing fields in a tenant-facing layout; no edit controls visible; "Back to Editor" navigates correctly.

---

### Task 3.8 — Reviewer feedback and correction flow
**Files**: `apps/web/src/components/owner/ReviewerFeedbackCard.tsx` (new)  
**Work**:
- Card component that renders the list of `ReviewAction` records where `actionTaken === 'REQUEST_CHANGES'`.
- Each entry: date, reviewer initials (masked), notes text, direct link to the affected section.
- Previous feedback cycles collapsible under "Show history".
- "Resubmit for Review" button: enabled when all required fields are populated; calls `POST /review/property/:id/submit`.

**Acceptance**: Card shows all change-request notes; history is collapsible; resubmit button calls the correct endpoint.

---

## Phase 4 — Owner Portal: Tenant Interactions and Agreements

### Task 4.1 — Tenant contact requests page
**File**: `apps/web/src/app/owner/contacts/page.tsx` (new)  
**Work**:
- Fetch contact requests for the owner's listings (needs `GET /contact/requests` owner-scoped endpoint — add if missing, document gap if needed).
- List rows: tenant initials/avatar placeholder, request date, listing address, status badge.
- "Grant Contact" button → calls `POST /contact/requests/:id/consent` → reveals masked contact info in the row.
- "Decline" button → confirmation dialog → API call.
- Never show full tenant PII before consent is granted.

**Acceptance**: Contact requests list renders; granting consent reveals contact info; declining requires confirmation.

---

### Task 4.2 — Viewings calendar page
**File**: `apps/web/src/app/owner/viewings/page.tsx` (new)  
**Work**:
- Fetch all `ViewingRequest` records for the owner's listings.
- Toggle between calendar view (monthly grid highlighting days with viewings) and list view.
- Each viewing: proposed date/time, masked tenant identifier, listing address, `ViewingStatus` badge.
- Viewing detail drawer (slide-in panel): full info + action buttons.
- Actions: Accept (API accept endpoint), Reschedule (requires new date/time + reason), Confirm (API confirm endpoint), Cancel.
- Completed and cancelled viewings filterable via status dropdown.

**Acceptance**: Toggle between calendar and list views works; actions call correct API endpoints; rescheduling requires reason + new time.

---

### Task 4.3 — Agreements page
**File**: `apps/web/src/app/owner/agreements/page.tsx` (new)  
**Work**:
- Fetch all `Agreement` records for the owner.
- List: listing address, masked tenant identifier, agreement `StatusBadge`, creation date, download link (presigned URL for `CLEARED` docs only).
- Upload signed agreement: `<FileUploader>` (PDF) → calls agreement upload endpoint.
- Status progression: Draft → Uploaded → Signed → Active / Rejected — each step explained inline.

**Acceptance**: Agreements list renders; document upload works; only cleared documents have accessible download links.

---

### Task 4.4 — Payments summary page (owner)
**File**: `apps/web/src/app/owner/payments/page.tsx` (update existing stub)  
**Work**:
- Fetch `GET /payments/owner/summary`.
- Display: total received (₹), pending, and any `PaymentHold` records with reason and fraud report reference link.
- Payment rows: listing, amount (₹), status badge, date.
- `<SandboxBanner>` always visible.

**Acceptance**: Summary figures render correctly in ₹; holds show reason and reference; sandbox banner visible.

---

### Task 4.5 — Notifications page and bell
**Files**: `apps/web/src/app/owner/notifications/page.tsx` (new), `apps/web/src/components/owner/NotificationBell.tsx` (new)  
**Work**:
- `NotificationBell`: polls `GET /notifications/:userId` every 60 s; shows badge (capped "99+"); opens slide-in drawer with notification list; clicking item marks read + navigates.
- Full notifications page: complete list with infinite scroll or pagination; tab filter (All / Unread).
- Preferences section: toggle switches for `emailEnabled`, `smsEnabled`, `pushEnabled` → `PATCH /notifications/:userId/preferences`.

**Acceptance**: Bell badge updates; clicking notification navigates to deep link; preferences toggles persist via API.

---

### Task 4.6 — Sessions and privacy pages
**Files**: `apps/web/src/app/owner/profile/sessions/page.tsx` (new), `apps/web/src/app/owner/profile/privacy/page.tsx` (new)  
**Work**:
- Sessions page: list active sessions from `GET /auth/sessions`; each row shows device ID, created date, last used, Revoke button (`DELETE /auth/sessions/:id` with confirmation).
- Privacy page: consent status per purpose; "Record Consent" / "Withdraw Consent" buttons; "Request Data Export" button (`POST /privacy/export`); "Request Account Deletion" button (`POST /privacy/delete`) with prominent warning modal explaining irreversibility.

**Acceptance**: Sessions list renders; revoke removes row; privacy actions call correct endpoints; deletion warning modal requires explicit confirmation.

---

### Task 4.7 — Support page
**File**: `apps/web/src/app/owner/support/page.tsx` (new)  
**Work**:
- Static FAQ accordion covering: KYC process, bank verification, property review timeline, presence challenge, listing lifecycle.
- Contact section: mailto link or placeholder for future chat integration.
- Link to privacy page.

**Acceptance**: FAQ renders and accordion opens/closes; contact link is functional.

---

## Phase 5 — Reviewer Portal: KYC and Bank Queues

### Task 5.1 — Reviewer dashboard
**File**: `apps/web/src/app/reviewer/dashboard/page.tsx` (update existing)  
**Work**:
- Replace the existing fraud-report-only dashboard.
- Show queue count cards for: KYC Pending, Bank Pending, Property Cases, Fraud Reports, Active Signals — each with count badge and link to queue.
- Recent Decisions table: last 10 `ReviewAction` records across all queues.
- Dark slate theme preserved.

**Acceptance**: All five queue cards render with counts; clicking each navigates to the correct queue; recent decisions table shows last 10 rows.

---

### Task 5.2 — KYC review queue and case page
**Files**: `apps/web/src/app/reviewer/kyc/page.tsx` (new), `apps/web/src/app/reviewer/kyc/[id]/page.tsx` (new)  
**Work**:
- Queue page: paginated table from `GET /reviewer/kyc/pending`. Columns: case ID, submission date, provider reference, days waiting, Review button.
- Case page:
  - Masked owner identity: `maskedResult` fields only (masked DOB, partial name).
  - `normalizedName` for name comparison.
  - Provider and provider reference.
  - `ownerState` badge.
  - Previous audit log entries for this owner (collapsible).
  - Decision form: `<AuditReasonField>` + APPROVE / REJECT buttons.
  - Two-step confirmation for REJECT.
  - On success: toast with audit ID; navigate back to queue.
- `<SandboxBanner>` on case page.

**Acceptance**: Queue paginates; case page shows masked identity only; APPROVE transitions state; REJECT requires reason + confirmation.

---

### Task 5.3 — Bank account review queue and case page
**Files**: `apps/web/src/app/reviewer/bank/page.tsx` (new), `apps/web/src/app/reviewer/bank/[id]/page.tsx` (new)  
**Work**:
- Queue page: paginated table from `GET /reviewer/bank/pending`. Columns: account ID, masked account number, beneficiary name, date, Review button.
- Case page:
  - Masked account number, beneficiary name, `beneficiaryResult` field.
  - Owner `normalizedName` for name-match comparison with a match/mismatch indicator.
  - Decision form: APPROVE / REJECT with reason.
  - Two-step confirmation for REJECT.
- `<SandboxBanner>` on case page.

**Acceptance**: Queue and case pages render; name-match indicator shows correct state; decisions call `POST /reviewer/bank/:id/decision`.

---

## Phase 6 — Reviewer Portal: Property Cases

### Task 6.1 — Property review queue
**File**: `apps/web/src/app/reviewer/cases/page.tsx` (new)  
**Work**:
- Fetch all `ReviewCase` records with `status === PENDING`.
- Table columns: case ID, property address snippet, masked owner name (first name + last initial), submission date, days in queue, risk signal count badge.
- Sorting: date submitted (default), days in queue, risk signal count.
- Pagination.
- "Assign to Me" button per row (action: ASSIGN via `POST /review/cases/:id/decide { action: 'ASSIGN' }`).

**Acceptance**: Table renders with correct columns; sorting works; Assign button fires correct API call.

---

### Task 6.2 — Property case detail: identity and address panels
**File**: `apps/web/src/app/reviewer/cases/[id]/page.tsx` (new — initial scaffold)  
**Work**:
- Case header: case ID, current `ReviewState` badge, days in queue, assigned reviewer indicator.
- Owner identity panel: masked — first name + last initial, `ownerState` badge, KYC status, `flaggedForFraud` indicator.
- Address comparison: structured address text panel + `<MapPin>` showing geocoded pin side by side.
- Layout: two-column desktop layout (evidence left, decision panel right).

**Acceptance**: Case header renders; owner identity is masked; map shows correct pin; two-column layout on ≥1024 px.

---

### Task 6.3 — Property case detail: document and photo viewers
**File**: `apps/web/src/app/reviewer/cases/[id]/page.tsx` (extend from Task 6.2)  
**Work**:
- Document section: for each `PropertyDocument` (CLEARED only), fetch presigned URL via `GET /storage/media/:id` and render in an `<iframe>` or download link. Infected files show "Infected — document unavailable" error state.
- Owner name match indicator: compare `extractedFields.ownerName` (from document OCR) against owner `normalizedName`; show ✓ Match / ✗ Mismatch badge.
- Photo gallery: `<MediaLightbox>` with all listing photos. If a `RiskSignal` with `ruleCode` matching `DUP_IMAGE_*` exists, show near-duplicate badge on the affected photos; fetch comparison via `GET /fraud/compare/media/:signalId`.
- Decrypted property identifiers via `GET /review/property/:propertyId/identifiers`.

**Acceptance**: Documents render (PDFs in iframe); name match indicator correct; duplicate image badge appears on affected photos; identifiers display.

---

### Task 6.4 — Property case detail: presence challenge panel
**File**: `apps/web/src/app/reviewer/cases/[id]/page.tsx` (extend)  
**Work**:
- Fetch `PresenceChallenge` record for the property.
- Show: challenge phrase, submitted photo (presigned URL), submission timestamp.
- Map view with TWO markers: property geocoded pin (blue) and challenge submission coordinates (red), with a line and distance label between them.
- Distance delta should visually signal proximity (green ≤100 m, yellow ≤500 m, red >500 m).

**Acceptance**: Both pins render on the map; distance is calculated and colour-coded; photo displays when quarantine status is CLEARED.

---

### Task 6.5 — Property case detail: verification checklist and risk signals
**File**: `apps/web/src/app/reviewer/cases/[id]/page.tsx` (extend)  
**Work**:
- Verification checklist: render each `PropertyVerification` record as a checklist item with status. "Override" button per item opens an inline form with `<AuditReasonField>` → calls `POST /review/property/:id/override/:checkType`.
- Overridden items marked with a distinct "Override" badge.
- Risk signals list: fetch `GET /risk/signals/PROPERTY/:propertyId` and `GET /risk/signals/USER/:ownerId`. Each signal: rule code, `SignalSeverity` badge, `<EvidenceRenderer>` component (design §12). "Resolve" button → `<AuditReasonField>` inline → `POST /risk/signals/:id/resolve`.

**Acceptance**: Checklist reflects `PropertyVerification` statuses; overrides persist and show badge; signals render with human-readable evidence.

---

### Task 6.6 — Property case detail: history, notes, and decision panel
**File**: `apps/web/src/app/reviewer/cases/[id]/page.tsx` (extend — complete page)  
**Work**:
- Case history timeline: chronological `ReviewAction` records — timestamp, reviewer initials, action badge, notes.
- Internal notes form: textarea + "Add Note" button; calls `POST /review/cases/:id/decide { action: 'NOTE', notes }` (or a dedicated notes endpoint if available).
- Audit history panel (collapsible): `AuditLog` entries for this property and owner from `GET /audit/logs?entityType=PROPERTY&entityId=...`.
- Decision panel (sticky right column):
  - `<AuditReasonField>` (required, shared across all actions).
  - Action buttons per the table in R-REV-08.1 (visibility depends on current `ReviewState`).
  - Destructive actions (REJECT, SUSPEND) use `<ConfirmModal>`.
  - On success: toast with audit ID; re-fetch case state.

**Acceptance**: All six sections render on the case page; decision buttons follow visibility rules; destructive actions require confirmation; audit ID shown in success toast.

---

## Phase 7 — Reviewer Portal: Fraud, Signals, and Payments

### Task 7.1 — Fraud report queue (update existing)
**File**: `apps/web/src/app/reviewer/dashboard/page.tsx` → migrate to `apps/web/src/app/reviewer/fraud/page.tsx`  
**Work**:
- Move the existing fraud queue to `/reviewer/fraud`.
- Extend table columns: report ID, subject type/ID, `SignalSeverity` badge (colour-coded), category, date, assigned reviewer, status.
- Update `apps/web/src/app/reviewer/dashboard/page.tsx` to show queue counts only (Task 5.1).

**Acceptance**: Fraud queue renders at new URL; severity badges are colour-coded; existing functionality preserved.

---

### Task 7.2 — Fraud report case page (update existing)
**File**: `apps/web/src/app/reviewer/fraud/[id]/page.tsx` (moved from `queues/[id]`)  
**Work**:
- Retain existing decision form (ASSIGN, INVESTIGATE, RESOLVE, DISMISS, RELEASE_HOLD).
- Add narrative text rendering.
- Add `evidence` JSON rendering via `<EvidenceRenderer>`.
- Add masked reporter identifier.
- Add subject entity deep link (to `/reviewer/cases/:id` for LISTING subject, or owner profile for USER subject).
- RESOLVE and DISMISS: apply two-step confirmation.
- All actions require `<AuditReasonField>`.

**Acceptance**: Evidence renders in human-readable format; deep link navigates to subject; RESOLVE/DISMISS require confirmation.

---

### Task 7.3 — Risk signals page
**File**: `apps/web/src/app/reviewer/signals/page.tsx` (new)  
**Work**:
- Fetch `GET /fraud/signals` with pagination and filters: severity (multi-select), entity type (select), status (ACTIVE/RESOLVED), date range.
- Table: signal ID, rule code, `SignalSeverity` badge, entity type/ID, created date, status.
- Signal detail side panel (slide-in on row click):
  - `<EvidenceRenderer>` for `evidenceJson`.
  - For `DUP_IMAGE_*` rule codes: `<MediaComparison>` component — side-by-side photos, similarity score bar, pHash values.
  - "Resolve" button with `<AuditReasonField>`.
  - "Re-evaluate" button → `POST /risk/evaluate/:type/:id`.

**Acceptance**: Table filters work; signal detail renders; duplicate image comparison shows two photos with score; resolve + re-evaluate call correct endpoints.

---

### Task 7.4 — Payment admin page (update existing)
**File**: `apps/web/src/app/reviewer/payments/page.tsx` (update existing stub)  
**Work**:
- Update existing payments page to fetch `GET /payments/admin`.
- Table: order ID, amount (₹), status badge, masked tenant identifier, listing, created date.
- Order detail panel: full timeline from `GET /payments/admin/:id/timeline` rendered as `<Timeline>` component.
- Refund button: `<AuditReasonField>` + `<ConfirmModal>` → `POST /payments/:id/refund`.
- Dispute button: `<AuditReasonField>` + `<ConfirmModal>` → `POST /payments/:id/dispute`.
- "Grant Payment Exception" form: listingId, tenantId, reason, expiry date → `POST /payments/eligibility-exceptions` with `auditReason`.
- `<SandboxBanner>` always visible.

**Acceptance**: All existing functionality preserved; timeline renders; refund/dispute require reason + confirmation; exception grant form submits with audit reason.

---

### Task 7.5 — Audit history page
**File**: `apps/web/src/app/reviewer/history/page.tsx` (update from placeholder)  
**Work**:
- Fetch `GET /audit/logs` (new endpoint from Task 0.8) with filters: action type, entity type, actor role, date range.
- Table: timestamp, actor role, action, entity type/ID, reason, request ID.
- Descending chronological order (default).
- Read-only — no edit or delete controls of any kind.
- `<Pagination>` component.

**Acceptance**: Table renders audit records; filters narrow results; all records are read-only.

---

## Phase 8 — Polish and Cross-Cutting

### Task 8.1 — `EvidenceRenderer` component
**File**: `apps/web/src/components/reviewer/EvidenceRenderer.tsx` (new)  
**Work**:
- Implement the rendering logic from design §12.
- Handle known `ruleCode` prefixes: `DUP_IMAGE_*`, `NAME_MISMATCH_*`, `ADDR_MISMATCH_*`, `SUSPICIOUS_ACTIVITY_*`.
- Fallback: generic key-value table for unknown shapes.
- All values escaped/sanitised before rendering (no `dangerouslySetInnerHTML`).

**Acceptance**: Each known rule code shape renders its custom component; unknown shapes fall back to key-value table; no raw JSON visible to reviewer.

---

### Task 8.2 — `MapPin` component (full implementation)
**File**: `apps/web/src/components/ui/MapPin.tsx` (implement the stub from Task 0.6)  
**Work**:
- Dynamic import of `react-leaflet` (SSR-safe).
- Single-pin mode: `lat`, `lng`, `label` props.
- Two-pin mode: additional `secondaryLat`, `secondaryLng`, `secondaryLabel`, `showDistanceLine` props — draws a polyline and distance label between the two points.
- Fallback: grey box with "Map unavailable" when coordinates are null.
- Marker icons using Leaflet's default blue (primary) and red (secondary) markers.
- Map height configurable via prop (default 300 px).

**Acceptance**: Single-pin renders centred on coordinates; two-pin renders both markers with distance line; null coordinates show fallback.

---

### Task 8.3 — `MediaLightbox` and `MediaComparison` components
**File**: `apps/web/src/components/ui/MediaLightbox.tsx` (new), `apps/web/src/components/reviewer/MediaComparison.tsx` (new)  
**Work**:
- `MediaLightbox`: full-screen overlay; prev/next navigation; keyboard arrow key support; close on Escape or backdrop click; near-duplicate badge prop that shows similarity score.
- `MediaComparison`: side-by-side two-image layout; similarity score progress bar (0–1 range); pHash values in monospace below each image; colour-coded score (green < 0.75, yellow < 0.90, red ≥ 0.90).

**Acceptance**: Lightbox opens and navigates with keyboard; close works; comparison shows correct score colour.

---

### Task 8.4 — `StatusBadge` component (canonical mapping)
**File**: `apps/web/src/components/ui/StatusBadge.tsx` (new)  
**Work**:
- Single component for all status enums: `PublishStatus`, `OwnerState`, `VerificationStatus`, `ReviewState`, `PaymentStatus`, `ViewingStatus`, `AgreementStatus`, `SignalSeverity`.
- Colour mapping:
  - Green: VERIFIED, PUBLISHED, APPROVED, CAPTURED, COMPLETED, CLEARED
  - Yellow: UNDER_REVIEW, KYC_REVIEW, NEEDS_REVIEW, PENDING, AUTHORIZED, PENDING_SCAN
  - Red: REJECTED, SUSPENDED, INFECTED, FAILED, CRITICAL (severity)
  - Orange: CHANGES_REQUESTED, HIGH (severity)
  - Blue: DRAFT, RENTED, RESOLVED
  - Grey: ARCHIVED, EXPIRED, REVOKED, LOW (severity)
- Accepts `status: string` and `type?: string` (for disambiguation if needed).

**Acceptance**: Each status value renders with the correct colour; unknown status values render with a grey neutral badge.

---

### Task 8.5 — Error boundary and global error handling
**Files**: `apps/web/src/components/ErrorBoundary.tsx` (new), `apps/web/src/app/layout.tsx` (update)  
**Work**:
- React `ErrorBoundary` class component wrapping the app root.
- Catches render errors and shows a user-friendly "Something went wrong" page without a raw stack trace.
- `ApiError` thrown by `apiClient` is caught in each page's `useEffect` and displayed via the `<Toast>` system:
  - 400: show `error.message` from API response.
  - 401: handled by silent refresh (already in apiClient).
  - 403: "You don't have permission to perform this action."
  - 409: "A conflict occurred — " + `error.message`.
  - 422: "Validation error — " + `error.message`.
  - 429: "Too many requests. Please wait before trying again."
  - 5xx: "Something went wrong on our end. Please try again."

**Acceptance**: API errors display as toasts with appropriate messages; raw stack traces never appear in the UI; 403 shows the access message.

---

### Task 8.6 — WCAG 2.1 AA accessibility pass
**Files**: all new components and pages  
**Work**:
- Audit all interactive elements for keyboard accessibility (Tab order, focus visible, Enter/Space activation).
- Add `aria-label` to icon-only buttons (notification bell, close buttons, modal dismiss).
- Ensure all form inputs have associated `<label>` elements (or `aria-labelledby`).
- Ensure all `<Badge>` and status indicators have `aria-label` (colour alone is not sufficient).
- Verify colour contrast ≥ 4.5:1 for all text against background.
- Add `role="alert"` to toast notifications.
- Add `aria-live="polite"` to loading state containers.

**Acceptance**: All new pages pass axe-core automated checks with zero critical violations; manual check confirms keyboard navigability of all forms.

---

### Task 8.7 — Re-verification warning — end-to-end wiring
**Files**: `apps/web/src/components/ui/ReVerificationWarning.tsx` (new), `apps/web/src/app/owner/dashboard/page.tsx` (update)  
**Work**:
- `ReVerificationWarning`: amber banner rendered when `ownerState !== 'VERIFIED'` or primary bank `status !== 'VERIFIED'`. Lists specific unverified fields. Non-dismissable. Links to each corrective sub-page.
- `CriticalChangeModal`: intercept modal before saving phone, email, bank, or KYC reinitiation — per design §11. Renders field-specific impact text. "Proceed" advances to save; "Cancel" aborts.
- Wire both components into all relevant pages (profile, bank, KYC).

**Acceptance**: Banner appears on dashboard when owner is not fully verified; dismissing is impossible; critical change modal fires before any phone/email/bank change is committed.

---

### Task 8.8 — Final smoke test and cleanup
**Work**:
- Run `pnpm build` from workspace root; fix any TypeScript errors.
- Run `pnpm lint` from workspace root; fix any ESLint violations.
- Remove all placeholder "coming soon" stubs replaced by real pages.
- Verify all navigation links in both portal layouts resolve to real routes.
- Confirm `<SandboxBanner>` appears on KYC, bank, presence challenge, and payments pages.
- Confirm `X-Audit-Reason` header is sent on all reviewer decision API calls.
- Confirm all monetary amounts throughout both portals display in ₹ (never raw paise).

**Acceptance**: `pnpm build` exits 0; `pnpm lint` exits 0; no broken nav links; sandbox banners in place; monetary display consistent.

---

## Dependency Order Summary

```
Phase 0 (Foundation) ──► Phase 1 (Auth UI)
                     └──► Phase 2 (Owner Verification) — depends on Phase 1
                     └──► Phase 5 (Reviewer Queues) — depends on Phase 1

Phase 2 ──► Phase 3 (Property & Listing)
Phase 3 ──► Phase 4 (Interactions & Agreements)

Phase 5 ──► Phase 6 (Property Cases) — depends on Phase 5
Phase 6 ──► Phase 7 (Fraud/Signals/Payments) — can start after Phase 6.1

Phase 4, Phase 7 ──► Phase 8 (Polish)
```

Tasks within the same phase that touch different files may be worked on in parallel.

---

## API Gaps — Summary of New Endpoints Required

| Task | Method | Path | Module |
|---|---|---|---|
| 0.7 | GET | `/auth/sessions` | AuthModule |
| 0.7 | DELETE | `/auth/sessions/:id` | AuthModule |
| 0.8 | GET | `/audit/logs` | AuditModule (new controller) |
| 0.9 | GET | `/review/property/:id/identifiers` | ReviewModule |
| 4.1 | GET | `/contact/requests` (owner-scoped) | ContactModule (if missing) |
| 2.1 | GET | `/property` (owner's own properties) | PropertyModule (if missing) |
| 3.5 | GET | `/property/:id/verifications` | PropertyModule (if missing) |
