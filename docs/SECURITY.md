# Security Hardening & Threat Mitigation Architecture

**Platform**: MYCHOICE.in  
**Security Posture**: Zero-Trust Layered E-Commerce Architecture

---

## 1. Threat Mitigation Matrix

| Potential Vulnerability / Attack Vector | Mitigation Architecture in MYCHOICE.in |
| :--- | :--- |
| **Client-Side Price Tampering** | Orders are strictly evaluated against authoritative database prices and active discount schedules on the server. The client never passes trusted monetary values. |
| **Inventory Overselling / Race Conditions** | Variant stock counts are verified prior to order persistence; purchases exceeding physical stock are blocked with HTTP 409. |
| **Double Submissions / Duplicate Charges** | Enforced client-generated idempotency tokens. Secondary submissions replay the existing order confirmation without re-charging. |
| **Credential / Secret Leakage** | CJ Access Tokens, Supabase Service Role keys, and Payment credentials reside strictly in server-side modules (`lib/cj/`, `app/api/`). |
| **Insecure Direct Object Reference (IDOR)** | Row Level Security (RLS) ensures customers can only query their own profiles, orders, and addresses. |
| **Webhook Spoofing / Replay Attacks** | Webhooks from CJ require valid HMAC-SHA256 signatures (`sign` header) matching the shared secret, with unique `messageId` deduplication. |
| **Abusive Scraping / Rate Limit Exhaustion** | CJ integration employs request throttling and exponential backoff retry handling on HTTP 429 and 50x responses. |
| **SQL Injection & Malformed Payloads** | Parameterized queries via Supabase client and strict Zod runtime schema validation on all API endpoints. |

---

## 2. Secrets Management & Environment Hygiene

- **Rule**: Never commit `.env` or `.env.local` files to Git.
- **Rule**: All sensitive server tokens (`CJ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CJ_WEBHOOK_SECRET`) must be injected exclusively via runtime environment variables.
- **Rule**: Logging utilities redact tokens and customer credentials automatically.
