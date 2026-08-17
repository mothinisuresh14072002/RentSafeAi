# Requirements — Owner Portal & Reviewer Portal

## Overview

RentSafeAi is a Chennai-specific rental platform that connects property owners with tenants under a trust-and-safety framework. Two internal portals sit at the heart of that framework:

- **Owner Portal** (`/owner/*`) — a self-service workspace where property owners complete verification, manage listings, respond to tenant interest, and track agreements and payments.
- **Reviewer Portal** (`/reviewer/*`) — an internal secure zone where trained staff review KYC cases, property evidence, fraud reports, and payment exceptions, taking audited decisions that drive listing lifecycle.

Both portals share the same Next.js 16 / React 19 / Tailwind CSS v4 frontend (`apps/web`) and communicate exclusively with the NestJS 11 API (`apps/api`) over JWT-authenticated REST calls. Every sensitive action is backed by an immutable `AuditLog` record on the API side.

---

## Existing API Capabilities (Ground Truth)

The API already exposes the following modules relevant to these portals. The frontend must surface them fully.

| API module | Key endpoints used by Owner portal | Key endpoints used by Reviewer portal |
|---|---|---|
| Auth | OTP request/verify, refresh, logout, logout-all | Same |
| OwnerProfile | `GET /owner/checklist`, `PUT /owner/profile` | — |
| KYC | `POST /kyc/initiate`, `GET /kyc/status` | `GET /reviewer/kyc/pending`, `POST /reviewer/kyc/:id/decision` |
| Bank | `POST /bank`, `GET /bank` | `GET /reviewer/bank/pending`, `POST /reviewer/bank/:id/decision` |
| Property | `POST /property/register` | — |
| Storage | `POST /storage/upload-request`, `POST /storage/finalize`, `GET /storage/media/:id` | `GET /storage/media/:id` |
| Listing | `POST /listings/property/:id/draft`, `PATCH /listings/:id`, `POST /listings/:id/submit` | `POST /listings/:id/publish` |
| Review | `POST /review/property/:id/submit` | `POST /review/cases/:caseId/decide`, `POST /review/property/:id/override/:checkType` |
| Viewing | Full lifecycle endpoints | — |
| Agreement | Full lifecycle endpoints | — |
| Payment | `GET /payments/eligibility`, `GET /payments/owner/summary` | `GET /payments/admin`, `GET /payments/admin/:id/timeline`, `POST /payments/:id/refund`, `POST /payments/:id/dispute`, `POST /payments/eligibility-exceptions` |
| Fraud / Risk | — | `GET /fraud/signals`, `GET /fraud/compare/media/:signalId`, `GET /risk/rules`, `GET /risk/signals/:type/:id`, `POST /risk/signals/:id/resolve`, `POST /risk/evaluate/:type/:id` |
| FraudReports | — | `GET /fraud-reports/queue`, `POST /fraud-reports/:id/actions` |
| Safety | — | `POST /safety/users/:id/override` |
| Contact | `POST /contact/requests/:id/consent` | — |
| Notifications | `GET /notifications/:userId`, `PATCH /notifications/:userId/preferences` | — |
| Consent | `POST /consent/record`, `POST /consent/withdraw` | — |
| Privacy | `POST /privacy/export`, `POST /privacy/delete` | — |

---

## Part 1 — Owner Portal Requirements

### R-OWN-01 Authentication

**R-OWN-01.1** The portal MUST provide a phone-number login page that calls `POST /auth/otp/request` and a separate OTP-entry step that calls `POST /auth/otp/verify`.  
**R-OWN-01.2** On successful verification the portal MUST store the returned `accessToken` and `refreshToken` in `localStorage` and redirect the user to `/owner/dashboard`.  
**R-OWN-01.3** The API client MUST silently refresh the access token via `POST /auth/otp/refresh` when a 401 response is received, and retry the original request once. A second 401 MUST redirect to login.  
**R-OWN-01.4** A "Sign out" action MUST call `POST /auth/logout` and clear all stored tokens.  
**R-OWN-01.5** A "Sign out all devices" action MUST call `POST /auth/logout-all`.  
**R-OWN-01.6** The portal MUST guard every `/owner/*` route with a client-side role check; users with `role !== OWNER` MUST be redirected to the login page.

---

### R-OWN-02 Dashboard

**R-OWN-02.1** The dashboard MUST display a verification progress bar or step indicator covering: phone verified → email verified → profile complete → KYC verified → bank verified.  
**R-OWN-02.2** Each incomplete step MUST link directly to the relevant sub-page with a clear CTA.  
**R-OWN-02.3** The dashboard MUST show a summary card for each registered property with: address snippet, property type, current `PublishStatus` badge, and quick links to manage the listing.  
**R-OWN-02.4** A notification bell MUST show unread count fetched from `GET /notifications/:userId` and link to the full notification list.  
**R-OWN-02.5** The dashboard MUST display a prominent, non-dismissable warning banner when a verified field (phone, email, KYC, bank) has been changed and re-verification is pending; the banner MUST name the specific field and explain that the associated listings are paused until re-verification completes.

---

### R-OWN-03 Profile and Contact Verification

**R-OWN-03.1** The profile page MUST allow editing of `firstName`, `lastName`, `displayName`, and `email` via `PUT /owner/profile`.  
**R-OWN-03.2** Phone verification MUST display the current verified phone number. Re-entry of a new number MUST trigger `POST /auth/otp/request` and require OTP confirmation before the change is saved.  
**R-OWN-03.3** Email verification MUST send a verification link/code (API support to be confirmed). Until verified, `isEmailVerified` remains false and the checklist step shows incomplete.  
**R-OWN-03.4** After any change to phone or email the portal MUST immediately show the re-verification warning described in R-OWN-02.5.  
**R-OWN-03.5** The profile page MUST display the current `ownerState` (e.g. "KYC Pending", "Verified") as a read-only badge.

---

### R-OWN-04 KYC Verification

**R-OWN-04.1** The KYC page MUST be accessible only when `ownerState` is `KYC_PENDING` or later.  
**R-OWN-04.2** The page MUST display the current KYC status badge: Pending / Under Review / Verified / Rejected.  
**R-OWN-04.3** When status is `KYC_PENDING`, a "Start KYC" button MUST call `POST /kyc/initiate`. In sandbox mode the response contains a mock redirect URL; the page MUST display it as a clearly labelled sandbox link.  
**R-OWN-04.4** While status is `KYC_REVIEW`, the page MUST show "Your identity documents are being reviewed. We'll notify you when complete." with an estimated timeframe.  
**R-OWN-04.5** When status is `REJECTED`, the page MUST display the rejection reason (from `maskedResult`) and a "Re-initiate KYC" button.  
**R-OWN-04.6** When status is `VERIFIED`, the page MUST show the verified date and expiry date in a success state.  
**R-OWN-04.7** KYC verification MUST be described as expiring; the portal MUST warn the owner at least 30 days before `expiryDate`.

---

### R-OWN-05 Bank / Beneficiary Verification

**R-OWN-05.1** The bank accounts page MUST list all accounts via `GET /bank` showing masked account number (`****1234`), beneficiary name, status badge, and whether the account is primary.  
**R-OWN-05.2** An "Add Bank Account" form MUST collect account number, IFSC code, and account holder name, then call `POST /bank`.  
**R-OWN-05.3** The form MUST display a clear note: "The account holder name must match your KYC name exactly."  
**R-OWN-05.4** If the API returns `NEEDS_REVIEW` status, the page MUST explain that the beneficiary name did not match automatically and the account is pending manual reviewer approval.  
**R-OWN-05.5** If status is `REJECTED`, the page MUST show the rejection reason and allow adding a new account.  
**R-OWN-05.6** Changing or adding a primary bank account after listings are published MUST surface the re-verification warning.

---

### R-OWN-06 Property Registration

**R-OWN-06.1** Property registration MUST be gated behind `canSubmitProperty === true` from `GET /owner/checklist`. The "Register Property" button MUST be disabled with an explanatory tooltip when the gate is not met.  
**R-OWN-06.2** The registration wizard MUST collect: property type (APARTMENT / INDEPENDENT_HOUSE / VILLA / BUILDER_FLOOR), Chennai street address (door number, street, area), locality (dropdown from the Chennai locality whitelist), pin code, and an optional floor/unit identifier.  
**R-OWN-06.3** The address form MUST be locked to Chennai; the locality dropdown MUST only show Chennai localities supported by the API.  
**R-OWN-06.4** After the address is entered, the portal MUST display a map pin on a map view (using coordinates returned by the API geocoder) and ask the owner to confirm: "Does this pin match your property location?" with Confirm / Adjust options.  
**R-OWN-06.5** The portal MUST clearly communicate address-deduplication: if a property with the same normalised address already exists, the API will return a conflict error and the portal MUST display a helpful message ("A property at this address is already registered").  
**R-OWN-06.6** After successful registration the portal MUST transition to the ownership document upload step (R-OWN-07).

---

### R-OWN-07 Ownership Document and Property Photo Uploads

**R-OWN-07.1** The uploads page MUST allow uploading ownership documents of types: TITLE_EXTRACT, PROPERTY_TAX, OTHER_EVIDENCE. Each upload MUST use the two-step presigned URL flow (`POST /storage/upload-request` → PUT to S3 → `POST /storage/finalize`).  
**R-OWN-07.2** Each document MUST show a quarantine status indicator: Scanning / Cleared / Infected. Infected files MUST be visually flagged and the owner MUST be prompted to remove and re-upload.  
**R-OWN-07.3** The portal MUST allow uploading up to 12 property photos (JPG/PNG/WEBP, ≤10 MB each) via the same presigned URL flow.  
**R-OWN-07.4** Photos MUST be reorderable via drag-and-drop; the resulting order MUST be saved to `mediaOrder` via `PATCH /listings/:id`.  
**R-OWN-07.5** A minimum of one document and three photos MUST be present before the submission button is enabled.  
**R-OWN-07.6** Documents and photos that are still in `PENDING_SCAN` status MUST be visually distinguished ("Scanning…") and the owner MUST be informed they cannot submit until all files are cleared.

---

### R-OWN-08 Live Property-Presence Challenge

**R-OWN-08.1** The portal MUST explain the presence challenge: "We'll ask you to take a photo at the property holding a visible sign with a phrase we give you, to confirm you are physically present."  
**R-OWN-08.2** The portal MUST display the challenge phrase from the active `PresenceChallenge` record and its expiry time with a live countdown.  
**R-OWN-08.3** Photo submission MUST use the same presigned upload flow and call `POST /storage/finalize` with `challengeMetadata`.  
**R-OWN-08.4** The portal MUST show the submitted challenge photo after upload and its review status.  
**R-OWN-08.5** If the challenge expires before submission, the portal MUST allow requesting a new one (API endpoint TBD; spec to be refined when endpoint is added).

---

### R-OWN-09 Verification Checklist

**R-OWN-09.1** A persistent checklist widget (sidebar or dedicated page) MUST display all verification steps for the current property: Owner KYC, Bank Verified, Ownership Document Uploaded & Cleared, Photos Uploaded & Cleared, Presence Challenge Submitted, Address Confirmed.  
**R-OWN-09.2** Each item MUST show one of: Not Started, In Progress, Pending Review, Verified, Action Required.  
**R-OWN-09.3** "Action Required" items MUST link directly to the relevant step.  
**R-OWN-09.4** The checklist MUST reflect `GET /owner/checklist` and the property's `PropertyVerification` records.

---

### R-OWN-10 Reviewer Feedback and Correction Flow

**R-OWN-10.1** When a reviewer requests changes (`ReviewState.CHANGES_REQUESTED` or `PublishStatus.CHANGES_REQUESTED`), the portal MUST display a dedicated feedback card listing the specific items flagged by the reviewer (from `ReviewAction.notes`).  
**R-OWN-10.2** Each flagged item MUST have a direct link to the relevant edit screen.  
**R-OWN-10.3** After the owner corrects the flagged items, a "Resubmit for Review" button MUST become enabled, calling `POST /review/property/:id/submit`.  
**R-OWN-10.4** The portal MUST maintain a visible history of previous reviewer feedback cycles for the owner's reference.

---

### R-OWN-11 Listing Creation, Editing, and Preview

**R-OWN-11.1** An "Create Listing" CTA on the property detail page MUST call `POST /listings/property/:propertyId/draft` and open the listing editor.  
**R-OWN-11.2** The listing editor MUST collect: rent amount (₹, converted to paise for the API), deposit amount, furnishing type, bedroom count, amenities (multi-select), available-from date, and description.  
**R-OWN-11.3** All fields MUST auto-save to `PATCH /listings/:id` with debounce (500 ms) to prevent data loss.  
**R-OWN-11.4** A "Preview Listing" mode MUST render the listing exactly as it would appear to a tenant on the public search results, using the `publishedVersion` snapshot.  
**R-OWN-11.5** The listing editor MUST display the current `lifecycleState` badge prominently.  
**R-OWN-11.6** All monetary amounts received from the API (stored in paise) MUST be divided by 100 and displayed in ₹ with comma formatting (e.g. ₹15,000). User input in ₹ MUST be multiplied by 100 before sending to the API.

---

### R-OWN-12 Listing Lifecycle Controls

**R-OWN-12.1** A "Submit for Review" button MUST be shown when `lifecycleState` is `DRAFT` or `CHANGES_REQUESTED`, and MUST call `POST /listings/:id/submit`.  
**R-OWN-12.2** A "Mark as Rented" button MUST be shown when `lifecycleState` is `PUBLISHED`, calling the appropriate API action (endpoint to be wired from the `PublishStatus.RENTED` transition).  
**R-OWN-12.3** An "Archive" button MUST be shown when the listing is `PUBLISHED` or `RENTED`, with a confirmation dialog explaining the action is reversible only by contacting support.  
**R-OWN-12.4** Unavailable controls MUST be greyed out with a tooltip explaining why (e.g. "Listing is under review — no changes allowed").  
**R-OWN-12.5** The portal MUST display a `SUSPENDED` or `EXPIRED` state prominently with the reviewer's stated reason and an option to contact support.

---

### R-OWN-13 Tenant Contact Requests

**R-OWN-13.1** The portal MUST list incoming `ContactRequest` records for each published listing, showing the tenant's initials/avatar (no personal details until consent is granted), request date, and current status.  
**R-OWN-13.2** An "Grant Contact" button MUST call `POST /contact/requests/:id/consent`, after which the tenant's masked contact details MUST become visible.  
**R-OWN-13.3** A "Decline" action MUST be available with a confirmation step.  
**R-OWN-13.4** The portal MUST never expose a tenant's full name or contact details before consent is explicitly granted.

---

### R-OWN-14 Viewing Calendar

**R-OWN-14.1** The viewings section MUST display all `ViewingRequest` records for the owner's listings in a calendar view and a list view, toggleable.  
**R-OWN-14.2** Each viewing MUST show: proposed date/time, tenant identifier (masked until consent), listing address, and current `ViewingStatus` badge.  
**R-OWN-14.3** The owner MUST be able to Accept a proposed viewing (API call to accept endpoint), Reschedule with a new date/time, or Confirm after both parties have acknowledged.  
**R-OWN-14.4** Rescheduling MUST require entering a reason and a new proposed time.  
**R-OWN-14.5** Completed and cancelled viewings MUST be visually distinct and filterable.

---

### R-OWN-15 Agreement References

**R-OWN-15.1** The agreements section MUST list all `Agreement` records associated with the owner's listings, showing: listing address, tenant identifier, agreement status badge, and creation date.  
**R-OWN-15.2** The owner MUST be able to upload a signed agreement document (`PATCH` or the agreement upload endpoint) and track signature status for both parties.  
**R-OWN-15.3** Agreement documents MUST be accessible via the presigned download URL flow (`GET /storage/media/:id`) — only `CLEARED` files MUST be shown.  
**R-OWN-15.4** Agreement status transitions MUST be clearly communicated: Draft → Uploaded → Signed → Active / Rejected.

---

### R-OWN-16 Sandbox Payment Summaries

**R-OWN-16.1** The payments page MUST fetch `GET /payments/owner/summary` and display: total payments received (in ₹), pending payments, any active `PaymentHold` records with their reason.  
**R-OWN-16.2** Individual payment rows MUST show: listing, amount, status badge, and date.  
**R-OWN-16.3** A "Sandbox Mode" banner MUST be persistently visible on the payments page to make clear no real money is involved.  
**R-OWN-16.4** Payment holds MUST be explained with the associated fraud report reference and a link to support.

---

### R-OWN-17 Notifications

**R-OWN-17.1** A notification panel (accessible from the bell icon) MUST list notifications from `GET /notifications/:userId`, showing title, body, timestamp, and read/unread state.  
**R-OWN-17.2** Clicking a notification MUST mark it as read and navigate to the relevant section if the notification has a deep link.  
**R-OWN-17.3** A notification preferences page MUST allow toggling `emailEnabled`, `smsEnabled`, and `pushEnabled` via `PATCH /notifications/:userId/preferences`.  
**R-OWN-17.4** The notification bell MUST show an unread count badge capped at 99+.

---

### R-OWN-18 Support

**R-OWN-18.1** A "Help & Support" link MUST be accessible from the nav.  
**R-OWN-18.2** The support page MUST display an FAQ section covering the top owner workflows (KYC, bank verification, property review, presence challenge).  
**R-OWN-18.3** A contact support form or chat link MUST be present. In the current sandbox phase this MAY be a mailto link or placeholder.

---

### R-OWN-19 Profile, Active Sessions, and Privacy Controls

**R-OWN-19.1** The account settings page MUST show all active sessions from the `Session` table (via a dedicated endpoint to be added if missing), with device info and last-active timestamp.  
**R-OWN-19.2** The owner MUST be able to revoke individual sessions or all sessions.  
**R-OWN-19.3** A GDPR / privacy section MUST allow:  
  - Recording and withdrawing consent via `POST /consent/record` and `POST /consent/withdraw`.  
  - Submitting a data export request via `POST /privacy/export`.  
  - Submitting a deletion request via `POST /privacy/delete`, with a clear explanation of consequences.  
**R-OWN-19.4** The portal MUST display the current consent status for each consent purpose.

---

### R-OWN-20 Re-verification Warnings

**R-OWN-20.1** Whenever the owner changes any of the following, a modal confirmation MUST be shown BEFORE the change is saved, explaining downstream impact:  
  - Phone number → "All active sessions will be revoked. KYC must be re-initiated. Your listings will be paused."  
  - Email address → "Email verification will be required again."  
  - Primary bank account → "Listing payments will be paused until the new account is verified."  
  - KYC re-initiation → "Your listings will be paused until the new KYC check is approved."  
**R-OWN-20.2** After any such change, the dashboard banner described in R-OWN-02.5 MUST appear until re-verification is complete.  
**R-OWN-20.3** A warning banner MUST also appear when KYC or bank verification is within 30 days of expiry.

---

## Part 2 — Reviewer Portal Requirements

### R-REV-01 Authentication and Access Control

**R-REV-01.1** The reviewer portal MUST share the same OTP login page as the owner portal, but MUST redirect to `/reviewer/dashboard` after a successful login where `role === REVIEWER` or `role === ADMIN`.  
**R-REV-01.2** Every `/reviewer/*` route MUST be server- or client-guarded; users without `REVIEWER` or `ADMIN` role MUST be redirected to an "Access Denied" page, not to the login page.  
**R-REV-01.3** The reviewer shell layout MUST retain its existing "Internal Secure Zone" badge and dark slate theme as a persistent visual trust indicator.  
**R-REV-01.4** Every action that mutates state MUST include the `X-Audit-Reason` header. The portal MUST enforce this by requiring a "Reason" text field in every decision/action form before the submit button is enabled.

---

### R-REV-02 KYC Review Queue

**R-REV-02.1** The KYC queue page MUST fetch `GET /reviewer/kyc/pending` and display a paginated list of pending `OwnerKycCase` records: case ID, date submitted, provider reference, and a "Review" action.  
**R-REV-02.2** The KYC case detail view MUST display:  
  - Masked owner identity: `maskedResult` JSON fields only (e.g. masked DOB, partial name). Full PII MUST NOT be rendered.  
  - `normalizedName` for name comparison.  
  - KYC provider and provider reference.  
  - `ownerState` and any previous rejection notes from `AuditLog`.  
**R-REV-02.3** The reviewer MUST be able to take one of two decisions via `POST /reviewer/kyc/:id/decision`: `APPROVED` or `REJECTED`, each requiring a mandatory reason.  
**R-REV-02.4** Submitting a decision MUST be optimistically disabled while the API call is in flight to prevent double submission.

---

### R-REV-03 Bank Account Review Queue

**R-REV-03.1** The bank queue page MUST fetch `GET /reviewer/bank/pending` and display a paginated list: account ID, masked account number, beneficiary name, date submitted, and a "Review" action.  
**R-REV-03.2** The bank case detail view MUST display: masked account number, beneficiary name (from the account record), `normalizedName` from the owner profile (for name-match comparison), the `beneficiaryResult` field, and status.  
**R-REV-03.3** The reviewer MUST be able to approve or reject via `POST /reviewer/bank/:id/decision` with a mandatory reason.

---

### R-REV-04 Property and Listing Review Queue

**R-REV-04.1** The property review queue MUST show all `ReviewCase` records where `status === PENDING` and `targetType === PROPERTY` or `LISTING`.  
**R-REV-04.2** Each queue item MUST display: case ID, property address snippet, owner display name (masked — first name + last initial), submission date, and days-in-queue count.  
**R-REV-04.3** Sorting MUST be supported by: date submitted (default, oldest first), days in queue, and risk score if a `RiskSignal` exists for the entity.  
**R-REV-04.4** The reviewer MUST be able to assign a case to themselves before taking any decision (action: `ASSIGN`).

---

### R-REV-05 Property Case Detail View

**R-REV-05.1** The case detail page MUST display the full property address alongside a map view showing the geocoded pin, so the reviewer can visually compare the submitted address text with the pin location.  
**R-REV-05.2** Ownership documents (TITLE_EXTRACT, PROPERTY_TAX, OTHER_EVIDENCE) MUST be viewable inline via presigned download URLs (`GET /storage/media/:id`). Only `CLEARED` documents MUST be served; `INFECTED` files MUST show an error state.  
**R-REV-05.3** Property photos MUST be viewable in a lightbox/gallery. Perceptual hash (`pHash`) comparison MUST surface a near-duplicate warning badge if `GET /fraud/compare/media/:signalId` returns a similarity score above 0.90.  
**R-REV-05.4** The owner name on the document (from `extractedFields`) MUST be compared against the owner's `normalizedName` from their profile. A match / mismatch indicator MUST be shown.  
**R-REV-05.5** `PropertyIdentifier` values (survey numbers etc.) MUST be displayed in decrypted form for the reviewer (API must expose a reviewer-specific endpoint; this is a gap to resolve in design).  
**R-REV-05.6** The presence challenge photo and submitted coordinates MUST be shown. The coordinates MUST be plotted on the same map view as the property pin so the reviewer can assess proximity.  
**R-REV-05.7** All active `RiskSignal` records for the property or owner MUST be listed with: rule code, severity badge, evidence summary, and a "Resolve" button.  
**R-REV-05.8** Explainable risk signals MUST show the `evidenceJson` in a human-readable summary panel, not raw JSON.

---

### R-REV-06 Reviewer Verification Checklist

**R-REV-06.1** The case detail view MUST include a structured verification checklist mirroring the property's `PropertyVerification` records: each `checkType` displayed as a checklist item with its current status.  
**R-REV-06.2** The reviewer MUST be able to override individual checks via `POST /review/property/:id/override/:checkType` with a reason; overrides MUST be visually distinguished from system-set statuses.  
**R-REV-06.3** The overall "Submit Decision" button MUST be disabled until all required checklist items are either verified or explicitly overridden.

---

### R-REV-07 Case History and Notes

**R-REV-07.1** The case detail view MUST show a chronological timeline of all `ReviewAction` records for the case: timestamp, reviewer name/ID (masked to initials), action taken, and notes.  
**R-REV-07.2** The reviewer MUST be able to add internal notes to the case without taking a formal decision.  
**R-REV-07.3** `AuditLog` entries for the owner and property MUST be accessible in a collapsible "Audit History" panel within the case detail, showing action, actor role (not identity), timestamp, and reason.

---

### R-REV-08 Reviewer Decision Actions

**R-REV-08.1** The case detail view MUST expose the following decision controls, each requiring a mandatory reason field:

| Action | Visible when state is | API call | Effect |
|---|---|---|---|
| Request Changes | PENDING / UNDER_REVIEW | `POST /review/cases/:id/decide` `{ action: "REQUEST_CHANGES" }` | Owner notified; listing moves to CHANGES_REQUESTED |
| Approve | PENDING / UNDER_REVIEW | `{ action: "APPROVE" }` | Listing moves to VERIFIED; owner can publish |
| Reject | PENDING / UNDER_REVIEW | `{ action: "REJECT" }` | Listing moves to REJECTED; owner notified with reason |
| Suspend | VERIFIED / PUBLISHED | `{ action: "SUSPEND" }` | Listing immediately hidden from search |
| Expire | VERIFIED | `{ action: "EXPIRE" }` | Listing expires; owner must resubmit |
| Reopen | REJECTED / SUSPENDED | `{ action: "REOPEN" }` | Case returns to PENDING |
| Escalate | any | internal flag (UI only, pending API endpoint) | Flags case for senior reviewer attention |

**R-REV-08.2** Destructive actions (REJECT, SUSPEND) MUST require a two-step confirmation: first click opens a confirmation modal, second click submits.  
**R-REV-08.3** All decisions MUST generate an `AuditLog` record on the API side (already implemented); the portal MUST display a success toast citing the audit log ID if returned.

---

### R-REV-09 Fraud Report Queue

**R-REV-09.1** The fraud report queue MUST fetch `GET /fraud-reports/queue` and display: report ID, subject type/ID, severity badge, category, date reported, assigned reviewer, and current status.  
**R-REV-09.2** Severity MUST be visually colour-coded: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (grey).  
**R-REV-09.3** The report detail view MUST show: narrative text, `evidence` JSON rendered as a structured summary, reporter identifier (masked), subject entity deep link (to the relevant listing or user).  
**R-REV-09.4** Available actions via `POST /fraud-reports/:id/actions`: ASSIGN, INVESTIGATE, RESOLVE, DISMISS, RELEASE_HOLD — each requiring a reason.  
**R-REV-09.5** RESOLVE and DISMISS MUST trigger the two-step confirmation pattern from R-REV-08.2.

---

### R-REV-10 Risk Signals Dashboard

**R-REV-10.1** A dedicated Risk Signals page MUST fetch `GET /fraud/signals` and display a paginated, filterable table: signal ID, rule code, severity, entity type/ID, created date, status.  
**R-REV-10.2** Filtering MUST be supported by: severity, entity type, status (ACTIVE / RESOLVED), and date range.  
**R-REV-10.3** A signal detail panel MUST render `evidenceJson` in a human-readable format (not raw JSON).  
**R-REV-10.4** Duplicate-image signals MUST surface the media comparison viewer: side-by-side display of the two photos with similarity score and `pHash` values, fetched from `GET /fraud/compare/media/:signalId`.  
**R-REV-10.5** The reviewer MUST be able to resolve a signal via `POST /risk/signals/:id/resolve` with a mandatory explanation.  
**R-REV-10.6** A "Re-evaluate" button MUST call `POST /risk/evaluate/:type/:id` to trigger fresh rule evaluation.

---

### R-REV-11 Payment Exception Review

**R-REV-11.1** The payments admin page MUST display all `PaymentOrder` records from `GET /payments/admin` with: order ID, amount, status badge, tenant identifier (masked), listing, and creation date.  
**R-REV-11.2** Clicking an order MUST open a full timeline from `GET /payments/admin/:id/timeline` showing each `PaymentTransaction` and `PaymentWebhookEvent` entry in chronological order.  
**R-REV-11.3** The reviewer MUST be able to simulate a refund via `POST /payments/:id/refund` and mark an order as disputed via `POST /payments/:id/dispute`, both requiring a reason.  
**R-REV-11.4** A "Grant Payment Exception" form MUST allow approving a `PaymentEligibilityException` via `POST /payments/eligibility-exceptions` (REVIEWER/ADMIN only), with mandatory fields: listingId, tenantId, reason, expiry date — and requiring `X-Audit-Reason`.  
**R-REV-11.5** A "Sandbox Mode" banner MUST be visible on all payment admin pages.

---

### R-REV-12 User Safety Controls

**R-REV-12.1** From a user detail view (or inline from any case that surfaces an owner's profile), the reviewer MUST be able to apply safety overrides via `POST /safety/users/:id/override`: SUSPEND, UNSUSPEND, FLAG_FOR_FRAUD.  
**R-REV-12.2** All three actions MUST require a mandatory reason and the two-step confirmation pattern.  
**R-REV-12.3** The user's current `status` and `flaggedForFraud` flag MUST always be visible in the case header.

---

### R-REV-13 Audit Log Viewer

**R-REV-13.1** A dedicated Audit History page MUST display `AuditLog` records with: timestamp, actor role, action, entity type/ID, reason, and request ID.  
**R-REV-13.2** Filtering MUST be supported by: action type, entity type, actor role, and date range.  
**R-REV-13.3** Records MUST be read-only and presented in descending chronological order. No editing or deletion is permitted.  
**R-REV-13.4** An API endpoint to query `AuditLog` records for a reviewer (currently not exposed) MUST be added as part of the implementation; this is a noted gap.

---

### R-REV-14 Immutable Audit Record Guarantee

**R-REV-14.1** Every decision, override, note, and escalation taken by a reviewer MUST produce an `AuditLog` record via `AuditService.log()` inside the same database transaction as the state change.  
**R-REV-14.2** The portal MUST never offer a "delete" or "undo" control for any reviewer action.  
**R-REV-14.3** The portal MUST display the audit log ID (returned in the API response) in the success toast after every decision, so the reviewer can reference it in support tickets.

---

## Cross-Cutting Requirements

### R-CROSS-01 Accessibility
All portal pages MUST meet WCAG 2.1 AA standards: keyboard navigability, ARIA labels on interactive elements, sufficient colour contrast, and visible focus indicators.

### R-CROSS-02 Responsive Layout
Both portals MUST be usable on viewports ≥ 1024 px wide (desktop-first). Tablet support (≥ 768 px) MUST be functional. Mobile is out of scope for these portals.

### R-CROSS-03 Error Handling
All API call failures MUST surface a user-visible error message (toast or inline). Network errors MUST be distinguished from API-level validation errors (4xx) from server errors (5xx). Raw stack traces MUST never be shown to end users.

### R-CROSS-04 Loading States
Every data-fetching operation MUST show a skeleton or spinner. Every mutating operation MUST disable the triggering button while in flight to prevent double submission.

### R-CROSS-05 Monetary Display
All amounts stored in paise MUST be displayed as ₹ with two decimal places and comma thousand-separators (e.g. ₹15,000.00). Input fields MUST accept ₹ and convert to paise before API calls.

### R-CROSS-06 Sandbox Indicators
All pages that involve KYC, payments, geocoding, or any sandbox-mocked provider MUST display a persistent "Sandbox / Test Mode" banner so it is unambiguous that no real data or money is involved.

### R-CROSS-07 Port Standardisation
The existing mismatch (API defaults to port 3000; web client defaults to 3001) MUST be resolved. Both MUST be set to the same value via `.env` before the portals ship.

### R-CROSS-08 Shared API Client Enhancement
The existing `src/lib/api-client.ts` MUST be extended to:
- Support the silent token refresh flow (R-OWN-01.3).
- Accept and forward the `X-Audit-Reason` header on a per-call basis.
- Accept and forward the `Idempotency-Key` header for payment order creation.
