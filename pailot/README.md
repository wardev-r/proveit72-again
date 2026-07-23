# PAILOT — salvage & archive manifest

Purpose: get the whole ecosystem out of chat and into real files. One engine, many skins.
This folder is the staging ground. Sensitive packs (Mantra) should move to encrypted USB, not public git.

## Legend
- **Status:** `HAVE` = full source captured in-session, ready to drop · `PARTIAL` = only fragments pasted, needs re-paste · `NEED` = not yet provided
- **Class:** `engine` (open-source-able core) · `support` (neutral utility, reusable) · `evidence` (QuikCard/proof) · `mantra` (private — keep off public git) · `demo`
- **Sec:** ⚠️ = has a security landmine to strip before any deploy

| Piece | File | Type | Status | Class | Sec |
|---|---|---|---|---|---|
| PAILOT engine (config-driven core) | `engine.html` | the engine | PARTIAL | engine | — |
| HVAC Parts Inventory Pro v4 | `hvac.html` | vertical skin | HAVE* | engine/demo | ⚠️ embedded AI key/prompts |
| QuikCard — Marketplace | `quikcard-marketplace.html` | evidence/sell | HAVE | evidence | ⚠️ `sk_live` field in localStorage |
| QuikCard — NFT Library | `quikcard-nft-library.html` | evidence/capture | HAVE | evidence | — (sha256 CDN dep) |
| QuikCard — Library (plain) | `quikcard-library.html` | evidence/capture | HAVE | evidence | — (ancestor of NFT ver → merge) |
| Workspace (percolator: post-its/shelves/vault) | `workspace.html` | support | PARTIAL | support | ⚠️ vault passphrase in JS (theater) |
| Conversation Wheel (session memory) | `conversation-wheel.html` | support | HAVE | support | — |
| Teardown Timeline | `timeline.html` | support | PARTIAL | support | — |
| Mantra (accountability/records, red skin) | `mantra.html` | vertical skin | PARTIAL | mantra | keep private |

\* HVAC full source was pasted early in the session; re-paste to guarantee byte-fidelity before relying on it.

## The architecture (one line)
`CONFIG`-driven engine → enrich → **human verify-queue** → **seal (notary + timestamp)** → publish.
Secret = only the **key + prompts (backend/Worker)**. The construct is commodity — open it. Moat = verified data + provenance.

## Fill order (paste one at a time; I save → commit → next)
1. engine.html (the core — most important to get whole)
2. hvac.html (re-paste for fidelity)
3. mantra.html
4. workspace.html, timeline.html (complete the partials)
5. QuikCard trio + wheel — drop from captured source, or re-paste

## Security rules before ANY of these deploy
- No `sk_live` / API key / Auth Token in client. Strip to backend.
- Vault/lock logic that lives in JS = theater; real gating is server-side.
- QuikCard/Mantra evidence: redact PII, honor sealed records, anchor hashes externally (notary/TSA).
