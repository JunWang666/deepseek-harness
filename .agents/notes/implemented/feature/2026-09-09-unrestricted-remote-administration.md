# Agent Note: Unrestricted remote administration opt-in

Status: implemented

English | [中文](2026-09-09-unrestricted-remote-administration.zh.md)

## Problem

An operator exposing the Web application through a public IP needs one setting that admits management requests and enables remote management controls. Binding alone leaves request trust, browser authentication, and Client loopback restrictions active.

## Decision

Web startup samples `DSH_UNSAFE_ALLOW_REMOTE` once; only `1` enables unrestricted access. The shipped profile defaults to an all-interfaces bind and passes `unsafeAllowRemote` to Connection. An explicit host still wins. Connection bypasses Host/Origin/Fetch-Metadata and browser-session checks at the shared authorization operation for HTTP routes and WebSocket upgrades. Index requests need no token, launch URLs omit it, and a Host-injected boolean enables Client management controls for remote authorities.

Request decoding, body limits, and tool permissions retain their enforcement. Browser authentication still initializes its credential state so ordinary Connection reconfiguration can restore the default policy.

## Alternatives considered

**Only extend trusted hosts.** Cookie authentication and remote-page management restrictions remain active, so this does not provide unrestricted administration.

**Infer permission from the bind address.** Reachability does not authorize removal of access control. The exact explicit opt-in preserves the default posture.

## Consequences

Every reachable caller has complete Host API authority, including settings and tool-capable Sessions. This intentionally gives up browser identity, DNS-rebinding protection, and cross-site request rejection.

The [browser trust](../architecture/2026-07-28-api-browser-trust-boundary.md) and [browser authentication](../architecture/2026-08-24-browser-token-authentication.md) decisions remain active for the default policy. Their supersession is partial and their security rationale remains useful.

## Verification

Focused tests cover exact opt-in, default rejection, management HTTP dispatch, index access, upgrade authorization, and remote-page policy. A keyless real-profile expected-output scenario covers the launch setting, unauthenticated remote-authority requests, and bootstrap policy.
