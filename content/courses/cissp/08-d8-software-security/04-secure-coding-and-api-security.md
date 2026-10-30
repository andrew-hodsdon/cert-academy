---
title: "Secure coding, API security and software-defined security"
kind: reading
est_minutes: 45
objectives:
  - Recognise source-code-level weaknesses and the OWASP Top 10 and CWE categories they belong to (8.5)
  - Apply secure coding practices, including input validation, output encoding and parameterised queries (8.5)
  - Secure APIs against the OWASP API Security Top 10 risks (8.5)
  - Explain software-defined security and security as code (8.5)
sources: [d8-isc2-cissp-outline, d8-owasp-top10, d8-mitre-cwe-top25, d8-owasp-api-top10-2023, d8-owasp-rest-cheatsheet, d8-owasp-sqli-cheatsheet, d8-owasp-input-validation-cheatsheet, d8-python-dbapi-pep249, d8-owasp-asvs, d8-nist-sp-800-218-ssdf, d8-cisa-secure-by-design]
---

## From weakness to vulnerability

A **weakness** is a type of mistake in code or design (MITRE catalogues them as **CWE** entries,
such as CWE-89 SQL injection). A **vulnerability** is a specific, exploitable instance of a
weakness in a specific product (catalogued as a **CVE**). Objective **8.5** asks you to know the
common weaknesses, the coding practices that prevent them, how to secure APIs, and how security
can be expressed as code.

## The weaknesses you must recognise

| Weakness | What goes wrong | Primary defence |
|---|---|---|
| **Injection** (SQL, OS command, LDAP, XPath) | Untrusted input is interpreted as code or query syntax | **Parameterised queries** / safe APIs that separate code from data; allow-list validation |
| **Cross-site scripting (XSS)** — reflected, stored, DOM | Untrusted input is rendered as script in another user's browser | **Context-aware output encoding**, Content Security Policy, framework auto-escaping |
| **Cross-site request forgery (CSRF)** | The victim's browser sends an authenticated request the user did not intend | Anti-CSRF tokens, SameSite cookies, re-authentication for sensitive actions |
| **Buffer overflow** / out-of-bounds write | Data written past the end of a buffer overwrites memory, possibly the return address | Bounds checking, safe functions, **memory-safe languages**, compiler protections (stack canaries, ASLR, DEP/NX) |
| **Integer overflow** | Arithmetic wraps around, producing a tiny or negative size | Range checks, safe arithmetic libraries |
| **Race condition / TOCTOU** | State changes between the **time of check** and the **time of use** | Atomic operations, locks, check-and-use in one step |
| **Broken access control / IDOR** | Server trusts a client-supplied identifier without checking ownership | **Server-side authorisation on every request**, deny by default |
| **Path traversal** | `../` sequences reach files outside the intended directory | Canonicalise then validate paths; use indirect references |
| **Insecure deserialisation** | Untrusted serialised objects trigger code execution | Do not deserialise untrusted data; integrity-check; allow-list classes |
| **Server-side request forgery (SSRF)** | Server fetches an attacker-chosen URL, reaching internal systems | Allow-list destinations, block internal address ranges, network segmentation |
| **Improper error handling** | Stack traces leak internals; errors leave the system **fail open** | Generic user messages, detailed internal logs, **fail secure** |
| **Hard-coded credentials** | Secrets in source code leak with it | Secrets manager, rotation, secret scanning |
| **Back doors / maintenance hooks** | Undocumented entry points bypass controls | Code review, removal before release, change control |
| **Memory leaks, dangling pointers** | Resource exhaustion, use-after-free | Memory-safe languages, static analysis |

Older CISSP material also mentions **covert channels** (storage and timing channels that move
information in ways the security policy did not intend), **logic bombs** and **time-of-check
attacks**; they belong to the same "flaws in code" family.

### OWASP Top 10

The OWASP Top 10 is an *awareness* list of web application risk categories, not a complete
standard. The **2021** edition, current when the 2024 CISSP outline was written, runs: A01 Broken
Access Control, A02 Cryptographic Failures, A03 Injection (now including XSS), A04 Insecure
Design, A05 Security Misconfiguration, A06 Vulnerable and Outdated Components, A07 Identification
and Authentication Failures, A08 Software and Data Integrity Failures, A09 Security Logging and
Monitoring Failures, A10 Server-Side Request Forgery.

The **2025** edition keeps **Broken Access Control at number one** (absorbing SSRF), raises
Security Misconfiguration, broadens components into **Software Supply Chain Failures**, and adds
**Mishandling of Exceptional Conditions**.

> [!TIP]
> Do not memorise rank numbers for the exam; memorise the **categories and their defences**. The
> stable facts are that broken access control tops both lists, injection includes XSS, and
> supply-chain/component risk is now a headline category. For a verifiable *requirements*
> standard, use **OWASP ASVS**, not the Top 10.

## Secure coding practices

These practices come from OWASP's cheat sheets, ASVS and the SSDF's **PW.5** ("create source code
by adhering to secure coding practices").

1. **Validate all input on the server, with allow-lists.** Define what is acceptable (type,
   length, format, range) and reject everything else. Deny-lists of "bad characters" are always
   incomplete. Client-side validation is a usability feature, never a control.
2. **Separate code from data.** Parameterised queries, prepared statements, safe OS APIs that take
   arguments as a list instead of a shell string.
3. **Encode output for its context** (HTML body, HTML attribute, JavaScript, URL, CSS).
4. **Authenticate and authorise on the server for every request.** Deny by default.
5. **Least privilege** for the code's own identities: the database account the app uses should
   not be able to drop tables.
6. **Fail secure** and handle errors without leaking detail.
7. **Use vetted cryptography libraries**; never write your own algorithms.
8. **Manage sessions** securely: random IDs, regenerate on login, secure and HttpOnly cookie
   flags, timeouts.
9. **Keep secrets out of code**; log security events without logging secrets or personal data.
10. **Adopt a coding standard** (e.g. SEI CERT for C/Java, the organisation's own) and enforce it
    with code review and SAST.

## API security

APIs expose business logic and data directly to machines, so the classic mistakes are about
**authorisation** and **consumption**. The OWASP API Security Top 10 (2023):

| Risk | Plain meaning | Control |
|---|---|---|
| API1 **Broken Object Level Authorization (BOLA)** | Change `/orders/1001` to `/orders/1002` and get someone else's order | Check the caller owns or may access *each object* on every request |
| API2 Broken Authentication | Weak tokens, no rate limit on login, unsigned JWTs accepted | Standard protocols (OAuth 2.0 / OIDC), validate token signature, audience and expiry |
| API3 Broken Object Property Level Authorization | API returns or accepts fields the caller should not see or set (excessive data exposure, mass assignment) | Return only needed fields; allow-list writable properties |
| API4 Unrestricted Resource Consumption | No limits on requests, payload size, pages | **Rate limiting**, quotas, pagination limits, timeouts |
| API5 Broken Function Level Authorization | A normal user calls an admin endpoint | Role checks per function; deny by default |
| API6 Unrestricted Access to Sensitive Business Flows | Bots buy all the tickets, automate sign-ups | Business-flow throttling, bot detection |
| API7 Server-Side Request Forgery | API fetches a user-supplied URL | Destination allow-lists |
| API8 Security Misconfiguration | Verbose errors, permissive CORS, missing TLS | Hardened configuration, automated checks |
| API9 Improper Inventory Management | Forgotten old versions and shadow APIs stay exposed | API inventory, retire old versions, gateway |
| API10 Unsafe Consumption of APIs | Trusting data from third-party APIs | Validate and sanitise upstream responses too |

An **API gateway** centralises authentication, rate limiting, schema validation and logging, but
object-level authorisation (BOLA) still has to be implemented in the service, because only the
service knows who owns each object. API keys identify an application; they are not, on their own,
user authentication.

## Software-defined security

**Software-defined security** means security controls that are defined, deployed and changed by
software rather than by manual configuration of individual devices:

- **Security as code / policy as code**: firewall rules, IAM policies and compliance rules
  written as version-controlled files (e.g. Open Policy Agent policies) and enforced automatically.
- **Infrastructure as code (IaC)** with security scanning before deployment, so a public storage
  bucket is caught in the pull request, not in production.
- **Software-defined networking** and micro-segmentation, where a controller applies security
  policy to workloads wherever they move.
- **Immutable infrastructure**: replace rather than patch in place, so the running state always
  matches a reviewed definition.

The benefits are consistency, review and audit trails (the same change management as code), and
speed. The risk: an error or a compromise in the policy repository or controller propagates
everywhere at once, so the controller and repository need the strongest protection.

## Worked example: fixing an injection flaw

**Situation.** A code review of an internal Python order-lookup service finds this function. The
`customer_id` comes from a query-string parameter.

```python
def get_orders(conn, customer_id):
    cur = conn.cursor()
    sql = "SELECT id, total FROM orders WHERE customer_id = '" + customer_id + "'"
    cur.execute(sql)
    return cur.fetchall()
```

**Step 1 — show the flaw.** An attacker sends `customer_id = x' OR '1'='1`. The query becomes:

```sql
SELECT id, total FROM orders WHERE customer_id = 'x' OR '1'='1'
```

The `OR '1'='1'` condition is always true, so every customer's orders are returned. The input
changed the *structure* of the query: that is injection (CWE-89).

**Step 2 — the primary fix: a parameterised query.** The SQL text is fixed; the value travels
separately and the driver binds it as data. (PEP 249 drivers such as `psycopg` use the `%s`
placeholder style; others use `?`.)

```python
def get_orders(conn, customer_id):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, total FROM orders WHERE customer_id = %s",
        (customer_id,),
    )
    return cur.fetchall()
```

Now `x' OR '1'='1` is searched for literally as a customer ID, and nothing is returned.

**Step 3 — defence in depth.**

```python
import re

CUSTOMER_ID = re.compile(r"^C[0-9]{8}$")   # allow-list: the real ID format

def get_orders(conn, customer_id, session_customer_id):
    if not CUSTOMER_ID.fullmatch(customer_id):
        raise ValueError("invalid customer id")          # generic message, fail secure
    if customer_id != session_customer_id:
        raise PermissionError("not authorised")          # object-level authorisation
    cur = conn.cursor()
    cur.execute(
        "SELECT id, total FROM orders WHERE customer_id = %s",
        (customer_id,),
    )
    return cur.fetchall()
```

- **Allow-list validation** rejects anything that is not a real customer ID format.
- The **authorisation check** fixes a second flaw the review should also flag: even a perfectly
  parameterised query let any caller read any customer's orders (an IDOR / BOLA problem).
- At the database, the service account gets **SELECT on `orders` only** (least privilege), so a
  future injection elsewhere cannot modify or drop data.

**Step 4 — stop the class recurring.** Add a SAST rule that flags string-built SQL, add a unit
test with the attack string, and update the coding standard to require the shared data-access
layer. That is root-cause remediation, not just a patch.

> [!WARNING]
> **Escaping quotes** or **stripping keywords** are weak substitutes for parameterisation, and a
> **WAF** is a compensating control that can be bypassed. On the exam, when the question asks for
> the **best** fix to SQL injection in code, choose parameterised queries (prepared statements).

## Check yourself

1. A user changes the number at the end of `GET /api/v1/invoices/7731` and receives another
   company's invoice. Name the weakness and the fix.
2. Why is client-side JavaScript validation not a security control?
3. A team stores firewall rules as version-controlled policy files applied by a pipeline. What new
   asset now needs the strongest protection, and why?

<details>
<summary>Answers</summary>

1. **Broken object level authorisation** (BOLA, API1; also called IDOR). Fix: on every request,
   the server checks that the authenticated caller is entitled to that specific invoice.
2. The attacker controls the client and can bypass it by sending requests directly. Validation
   must be repeated on the server.
3. The **policy repository and the pipeline** that applies it. A malicious or mistaken change
   there is applied everywhere at once, so it needs access control, mandatory review, signing and
   audit logging.

</details>

## Sources

ISC2 CISSP exam outline (objective 8.5); OWASP Top 10 and MITRE CWE Top 25 for weakness
categories; OWASP API Security Top 10 (2023) and REST Security Cheat Sheet for API controls; OWASP
SQL Injection Prevention and Input Validation cheat sheets and PEP 249 for the worked example;
OWASP ASVS and NIST SP 800-218 (PW.5) for secure coding requirements; CISA Secure by Design for
eliminating defect classes.
