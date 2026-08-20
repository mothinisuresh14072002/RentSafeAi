# RentSafe AI owner verification overlay

This overlay was prepared against the current public `main` branch structure of:

`mothinisuresh14072002/RentSafeAi`

## Why this is an overlay instead of a direct GitHub commit

The connected GitHub identity had read access but no push permission to the repository at preparation time.

## Files that are direct replacements / additions

Copy the overlay into the GitHub repository root while preserving paths.

## Complete replacements included

The overlay now contains complete replacements for the reviewer service, storage controller, file uploader, property wizard, ownership-verification page, and property-photo page. No manual patch-note step is required.

## Important correction included

The previous owner property wizard called `/properties` with a payload that did not match the actual NestJS `POST /property/register` DTO. The replacement page uses the current backend route and exact `RegisterPropertyDto` shape.

## Verification invariants

1. Owner KYC is required before a property claim.
2. New property claims are `INACTIVE`.
3. Duplicate normalized address is rejected.
4. Duplicate legal property identifier hash is rejected.
5. `REGISTRY_EXISTENCE` is required.
6. `OWNERSHIP_MATCH` is required.
7. Those two checks cannot be reviewer-overridden.
8. A property becomes `ACTIVE` only when both hard checks are `VERIFIED`.
9. Listing create/update/submit/publish calls re-check hard ownership.
10. AI/document checks can flag risk but cannot establish legal ownership alone.

## Production work still required

- Replace `SandboxPropertyRegistryProvider` with a legally permitted official/licensed registry adapter.
- Replace `SandboxDocumentIntelligenceProvider` with OCR/document-analysis over actual private object storage.
- Use real envelope encryption for property identifier values.
- Verify uploaded object existence/checksum in the storage finalize endpoint.
- Add integration tests for the complete owner verification happy path and mismatch path.
