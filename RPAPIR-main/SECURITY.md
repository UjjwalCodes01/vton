# Security model

## Goal

Prevent upstream provider credentials from being exposed to the client, reduce unauthorized invocation, and keep enough audit state to investigate abuse or failures.

## Threats covered

- accidental provider-key disclosure in Google Sheets, Terraform, source code, or logs
- a client replaying a captured bearer token
- unauthorized callers reaching the application
- concurrent Lambdas selecting the same provider key repeatedly
- one failed key being retried on every request
- late responses incorrectly reactivating a disabled key
- provider error responses leaking upstream details to the client
- a client choosing an arbitrary upstream URL (SSRF-style behavior)
- excessive request concurrency overwhelming the upstream

## Strong B2B mode

Use:

1. API Gateway HTTP API
2. Regional custom domain
3. mTLS client certificate
4. `disable_execute_api_endpoint = true`
5. application token as an additional layer
6. API Gateway route throttling
7. Lambda reserved concurrency
8. DynamoDB conditional writes + leases
9. Secrets Manager + KMS
10. CloudWatch + CloudTrail

AWS documents mTLS for HTTP APIs and specifically recommends disabling the default execute-api endpoint when clients should only use the mTLS custom domain.

## What the upstream provider sees

The upstream provider receives an HTTPS request from the proxy. The proxy does not forward the client's Authorization header or source IP headers. Do not add them later unless there is a deliberate privacy/audit requirement.

The provider will still have its own logs and AWS will retain service/audit telemetry. The system is not designed to make activity untraceable; it is designed to keep credentials private and access controlled.

## Secret rules

Never place actual provider credentials in:

- Git
- Google Sheets
- Terraform variables/state
- Lambda environment variables
- `.env`
- log statements
- error responses
- the friend's client application

Provider credentials should exist only in Secrets Manager and transient application memory while a request is being made.

## Client credential rules

The client token is only a second application-layer secret. In strong B2B mode, mTLS is the primary transport-level identity control. Keep the client token on the friend's server, not in browser JavaScript, mobile source, or public repositories.

If the client token is compromised, issue a new client credential and revoke the old one.

## Provider error rules

Customize `src/provider.ts` from the provider's documented error contract. In particular:

- a documented quota-exhaustion signal can quarantine a key
- a documented invalid/revoked credential signal can quarantine a key
- a normal `429` should normally be treated as temporary rate limiting, not proof of exhausted credits
- ordinary 4xx request errors should not rotate through the whole key pool
- only errors that are safe to retry should trigger automatic failover

## Incident response

1. Disable the affected client credential.
2. Rotate/revoke any provider credential that may have been exposed.
3. Review CloudTrail for unexpected Secrets Manager access or IAM changes.
4. Review Lambda and API Gateway logs using request IDs.
5. Rebuild the mTLS truststore if a client certificate must be revoked.
6. Re-enable only after credentials and access paths have been checked.
