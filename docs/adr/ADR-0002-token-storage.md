# ADR-0002 — Token storage: persisted, opt-in (architect veto overridden with conditions)

**Status:** Accepted (owner decision, 2026-10-27) · Supersedes round-1 "sessionStorage-only" inclination

## Context
Round-1 founder-UX finding: a founder who cannot self-provision a PAT must not re-paste it every session; sessionStorage reinstitutes the founding friction daily. The architecture round-1 vetoed any persisted token; the owner explicitly chose persistence. The security review quantified all branches.

## Options table (from security round-2)
| Dimension | sessionStorage | **persisted (IndexedDB) — chosen** | IDB + WebCrypto wrap |
|---|---|---|---|
| Founder re-auth every cold start | yes | **no** | no |
| In-origin-XSS exposure | equal to persisted | equal | equal (wrap is cosmetic vs code-in-origin) |
| At-rest artifact | none per-tab | plaintext on disk | ciphertext (real gain: disk/backup dumps only) |
| Multi-tab | per-tab re-auth | shared token (BroadcastChannel lease becomes load-bearing) | same |

Honest conclusion recorded: **browser at-rest cannot defend against code running on this origin**; the real boundary = fine-grained single-repo scope + rotation + CSP + zero third-party scripts (SECURITY.md).

## Decision (persisted branch, with conditions)
- Opt-in checkbox **"Remember on this device"**, pre-ticked at owner handover (owner provisioned the device); helper copy: "Stored in this browser. Any code running on this page could still read it — this is convenience, not protection. Revoke anytime at github.com/settings/tokens."
- Hard conditions: wipe on sign-out · wipe on 401 after failed re-probe · bootstrap = restore→unwrap→re-probe (failure ⇒ wipe + silent re-prompt) · never in URL/query (`?token=` parity rejected forever, standing veto) · sessionStorage fallback mode available per device · ADR + SECURITY.md updated together, always.
- Draft store lifecycle is orthogonal — never coupled to token lifecycle.
- We do NOT fabricate an expiry UI (GitHub API cannot introspect PAT expiry); the handover card records setup date + owner-chosen rotation window to render the "renew after Tue 2 Feb" chip.

## Consequences
- XSS threat model unchanged, but the blast radius of a compromise includes a standing token until rotation — accepted by owner; mitigations named above are the compensations.
- e2e must run the full editing loop in the persisted path (INV-A01).
