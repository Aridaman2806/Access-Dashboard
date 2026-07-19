# Integration contract: connecting the real agent builder platform to this gateway

This is the spec for whoever owns/implements the real agent builder platform. It replaces
`mock-agent-builder` (a local testing tool only — see below) as the caller of this gateway.

## What has to change on your side

1. **Point your MCP client at this gateway's URL** instead of the real MCP server's URL directly.
2. **Send a shared secret on every request**, as the `X-Gateway-Auth` header. You'll be given this
   value out-of-band (not over email/Slack in plaintext) — generate it with `openssl rand -hex 32`
   if you're the one provisioning it, and configure it identically on both sides.
3. **Send the logged-in user's identity as headers on every request**, once your platform has
   already authenticated them via your own SSO/Azure AD flow:
   - `X-User-Email` — required
   - `X-User-Name` — required
   - `X-User-Department` — optional, but strongly recommended if you have it. Whatever value
     Azure AD gives you for the user's department, forward as-is.

That's the entire contract. This gateway does not call back into your platform, does not validate
any Azure AD token itself, and does not need its own Azure AD App Registration — it trusts the
shared secret as proof the request came from you, and trusts you to have already done real SSO
validation before forwarding the user's identity.

## What happens if something's missing

| Condition | Response |
|---|---|
| Missing or wrong `X-Gateway-Auth` | `401`, `Missing or invalid X-Gateway-Auth` |
| Secret is correct but `X-User-Email`/`X-User-Name` missing | `400`, `Missing X-User-Email or X-User-Name header` |
| Everything present | Normal MCP response — `tools/list` returns only tools this user is allowed to use; `tools/call` on a disallowed tool returns an MCP error result (`isError: true`) instead of a raw HTTP error |

## Department matching

Whatever string you send as `X-User-Department` gets compared, case- and whitespace-insensitively,
against whatever tags an admin has set on each tool in this system's Tool Registry. Normalization
only handles casing/whitespace differences (e.g. `"Engineering"` vs `"engineering "` will match) —
it does **not** handle synonyms or abbreviations (e.g. `"Eng"` will *not* match a tool tagged
`"Engineering"`). If your directory's department values don't match this system's tag taxonomy,
that's a data/process problem to resolve with whoever administers the Tool Registry, not something
this normalization can paper over.

## Not part of this contract (do not build against these assumptions)

- This gateway does **not** independently validate Azure AD tokens, do JWT/JWKS verification, or
  call Microsoft Graph. If you were planning to just forward a raw Azure AD token instead of the
  three headers above, that won't work — send the headers.
- This gateway does **not** expose any endpoint for you to query permissions ahead of time —
  `tools/list` and `tools/call` are the only two operations, and both already enforce permissions
  inline.

## About `mock-agent-builder`

The `mock-agent-builder/` folder in this repo is a local stand-in used to develop and demo this
gateway before your platform's integration existed — a tiny app with hardcoded test-account
logins. It uses this exact same contract (shared secret + the three headers), so it's a working
reference implementation if you want to see the contract in action:
`mock-agent-builder/api/src/gatewayClient.ts` is the relevant file. It refuses to start if
`NODE_ENV=production` and should never be deployed anywhere near production traffic — once your
platform is pointed at the gateway, `mock-agent-builder` simply isn't needed anymore.
