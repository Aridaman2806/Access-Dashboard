export interface DemoAccount {
  email: string;
  password: string;
  name: string;
}

/**
 * Mock SSO stand-in only. A real agent builder platform authenticates via
 * actual SSO and never sees a password — this hardcoded list and plaintext
 * comparison exist purely so this demo app can simulate "logging in as
 * different users" without wiring up a real identity provider. No department
 * field: this demo's access is driven entirely by project-code grants.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "alice@demo.local", password: "demo-pass-1", name: "Alice Chen" },
  { email: "bob@demo.local", password: "demo-pass-2", name: "Bob Singh" },
  { email: "carol@demo.local", password: "demo-pass-3", name: "Carol Diaz" },
  { email: "dave@demo.local", password: "demo-pass-4", name: "Dave Okafor" },
  { email: "erin@demo.local", password: "demo-pass-5", name: "Erin Walsh" },
];
