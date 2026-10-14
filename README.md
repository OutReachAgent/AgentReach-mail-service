# AgentReach Mail Service

Standalone mail control plane for AgentReach.

This service will own the parts of email delivery that should not live inside
the main AgentReach API:

- verified sending domains and sender identities;
- durable outbound message queue;
- delivery workers and retry policy;
- SMTP/MTA integration;
- DKIM, SPF, DMARC, and return-path configuration;
- bounce, suppression, and delivery events;
- inbound campaign replies.

The service is intentionally separate from `AgentReach-backend`. The backend
will submit authenticated messages and consume delivery events; it should not
need to know whether the message was delivered by SES, Postfix, or another
provider.

## Architecture direction

The application layer will be NestJS. A proven MTA such as Postfix should be
used for internet-facing outbound delivery rather than implementing the SMTP
delivery protocol in application code. The existing Node SMTP process in the
backend can be migrated here for inbound reply handling.

```text
AgentReach API
    │ authenticated submission
    ▼
Mail API + durable queue
    │
    ▼
Delivery worker ──► Postfix/MTA ──► recipient MX servers
    ▲
    │ delivery, bounce, and reply events
    └────────────── inbound SMTP
```

## Initial development

```bash
cp .env.example .env
npm install
npm run start:dev
```

Health endpoint:

```text
GET http://localhost:3020/api/health
```

The internal submission endpoint is available at
`POST /api/internal/messages` and requires the `x-internal-mail-secret`
header. Submissions require both `MAIL_ACCEPT_SUBMISSIONS=true` and a
configured `SMTP_HOST`. The service sends synchronously through that SMTP
transport and retries transient failures before returning `SENT`.

For local development, point `SMTP_HOST` at Mailpit (`127.0.0.1`, port
`1025`) or another local SMTP sink. For internet delivery, point it at a
Postfix instance that owns the sending IP and has SPF, DKIM, DMARC, reverse
DNS, and port 25 configured for the sending domain.

Set `SMTP_HELO_NAME` to the public hostname whose A record points to the
outbound server, such as `mail.example.com`. The sender domain still needs the
TXT verification record and the SPF/DKIM/DMARC records required by the MTA.

The current delivery transport is intentionally synchronous while the durable
Mongo/Redis queue is being built. Do not expose the internal endpoint publicly.

## Planned modules

```text
src/
  health/       liveness and readiness checks
  domains/      domain ownership and DNS verification
  senders/      sender identities and defaults
  messages/     message records and idempotency
  queue/        durable jobs and retry scheduling
  delivery/     delivery workers and MTA adapter
  inbound/      reply and bounce ingestion
  suppression/  bounce, complaint, and unsubscribe suppression
  internal/     authenticated backend integration endpoints
```

## Repository boundaries

The main AgentReach backend remains responsible for campaigns, contacts,
templates, authentication, and product-level analytics. This service is
responsible for mail transport, sender authorization, delivery state, and
mail-specific operational controls.

## Delivery milestones

1. Add the provider-neutral submission contract and health checks. **Done**
2. Add domain verification and sender identity storage. **Done in the API**
3. Add SMTP/Postfix delivery with retry and idempotency protection. **Initial transport done**
4. Add durable queueing and idempotent delivery records.
5. Add inbound replies, bounces, and suppression.
6. Connect the AgentReach backend behind a feature flag.
7. Run low-volume pilot traffic before removing SES.

