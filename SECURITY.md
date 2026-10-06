# Security Policy

RentSafe AI handles identity, property evidence, rental interactions, and payment-related state. Security reports are treated as sensitive.

## Supported branch

Security fixes target the current `main` branch.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for vulnerabilities that could expose user data, bypass ownership verification, weaken authorization, leak credentials, enable payment abuse, or permit document/object-storage access.

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available. If private reporting is unavailable, contact the repository owner privately through GitHub before disclosing technical details publicly.

Include:

- affected endpoint/component;
- impact;
- reproducible steps or proof of concept;
- required account/role;
- suggested mitigation, if known.

## Scope priorities

High-priority reports include authentication/session bypass, IDOR/BOLA, reviewer/admin privilege escalation, ownership-gate bypass, webhook forgery, object-storage exposure, SQL/command injection, SSRF, stored XSS, secret leakage, and unsafe handling of uploaded evidence.

Do not include real tenant/owner personal information in a report.
