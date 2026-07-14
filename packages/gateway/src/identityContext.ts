import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestIdentity } from "@mcp-access/core";

/**
 * Propagates the calling user's identity to the MCP request handlers, which
 * the SDK's Server class invokes without giving us a hook to pass per-request
 * data through its own call signature. Using AsyncLocalStorage (rather than
 * relying on any particular shape the MCP SDK's handler args happen to
 * expose) keeps this robust to SDK version changes.
 */
const storage = new AsyncLocalStorage<RequestIdentity>();

export function runWithIdentity<T>(identity: RequestIdentity, fn: () => T): T {
  return storage.run(identity, fn);
}

export function getCurrentIdentity(): RequestIdentity {
  const identity = storage.getStore();
  if (!identity) {
    throw new Error("No request identity in context — identity middleware must run before MCP handlers.");
  }
  return identity;
}
