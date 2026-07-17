# Think-about-it pile

Parked ideas — not now, not lost. Pull one out when it's actually time.

---

## Agent-readiness audit (from isitagentready.com) — parked 2026-07-17

The site already has a real agent layer (`llms.txt`, `agents.json` execution board,
`robots.txt`, per-page `agent-spec` blocks). The audit suggested 11 more items.
Honest triage below so we don't fake capabilities we don't have.

### Worth doing when we circle back (real + safe)
- **Content-Signal in robots.txt** — declare AI-usage prefs, e.g.
  `Content-Signal: ai-train=no, search=yes, ai-input=yes`. *Decision needed:* the
  actual policy values are Robert's call.
- **`/.well-known/api-catalog`** (application/linkset+json) — the Worker API at
  `api.velvetrope2you.com` is real, so this is honest. Point it at a `service-doc`
  and a `status`/health endpoint.
- **Link response headers** via a Cloudflare Pages `_headers` file, advertising the
  api-catalog to agents (RFC 8288).
- **service-doc** — real markdown docs for the public endpoints (`/call-info/:h`,
  `/health`). Keep it read-only-safe; don't invite auto-charging.
- **Markdown-for-agents** — NOT a file: it's a one-click toggle in the Cloudflare
  dashboard (Fundamentals → Markdown for Agents). Just flip it.

### Skip unless the capability becomes real (would be fabrication)
- OAuth/OIDC discovery, OAuth protected-resource, `auth.md` — 72 has **no OAuth
  server** (auth/pay is Stripe). Publishing issuer/token endpoints that don't exist
  breaks any agent that trusts them.
- MCP Server Card — **no MCP server** exists to point at.
- Agent-skills discovery index — `agents.json` already fills this role; a fake index
  with sha256 digests for nonexistent hosted skills is worse than nothing.

### Later / needs infra
- **DNS-AID** (SVCB/HTTPS records + DNSSEC) — infra, and don't touch DNS while the
  domain resolution is still being sorted.
- **WebMCP** (`navigator.modelContext.provideContext()`) — bleeding-edge browser API.
  Real future fit for the caller flow (expose "pay to call" as an agent tool), but
  premature today.
