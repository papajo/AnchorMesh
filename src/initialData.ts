import { CodeFile, AnchorTag, AnchorTagType, TriggerRule, TagVariable } from "./types";

export const INITIAL_FILES: CodeFile[] = [
  {
    name: "api-gateway.ts",
    language: "typescript",
    description: "Global router entry point with authentication middleware and route configuration.",
    content: `import express from "express";
import { rateLimiter } from "./rate-limiter";
import { authenticate } from "./auth-service";

const gateway = express();

// @anchor[GW-01]: Route security validation guard
// Severity: high | Purpose: Ensures all incoming microservice requests are signed
gateway.use((req, res, next) => {
  const token = req.headers.authorization;
  if (!token || !authenticate(token)) {
    return res.status(401).json({ error: "Access Denied: Missing valid gateway secret token" });
  }
  next();
});

// @anchor[GW-02]: Telemetry rate limits
// Severity: medium | Purpose: Checks rate limit caps dynamically and reports status to logs
gateway.get("/api/v1/resource", rateLimiter, (req, res) => {
  res.json({ message: "Welcome to the gateway network portal!" });
});

export default gateway;`
  },
  {
    name: "auth-service.ts",
    language: "typescript",
    description: "JWT Token constructor and permission validating checks.",
    content: `import jwt from "jsonwebtoken";

const SECRET_SALT = process.env.JWT_SECRET || "default_fallback_salt";

// @anchor[AUTH-01]: Token generation cipher
// Severity: high | Purpose: Core authentication token generator using HS256 encryption
export function generateToken(user: { id: string; role: string }) {
  return jwt.sign(user, SECRET_SALT, { expiresIn: "2h" });
}

// @anchor[AUTH-02]: Legacy login support (Flagged for Cleanup)
// Severity: low | Purpose: Temporary login router for obsolete customers. Schedule for complete shift to SHA-256
export function authLegacyUser(credentials: any) {
  console.warn("LEGACY LOGIN WARNING: Insecure auth algorithm used. Migrate to oauth immediately.");
  return credentials.username === "admin" && credentials.password === "secret_123";
}

export function authenticate(token: string): boolean {
  try {
    return !!jwt.verify(token, SECRET_SALT);
  } catch {
    return false;
  }
}`
  },
  {
    name: "payment-handler.ts",
    language: "typescript",
    description: "Third-party payment gateways integration and financial transaction logs helper.",
    content: `import Stripe from "stripe";
import { db } from "./db-client";

// @anchor[PAY-01]: Stripe payment provider integration
// Severity: high | Purpose: Gateway endpoint linking client payment card payload securely
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "stub_api_key_001");

export async function processPayment(amount: number, currency: string) {
  // @anchor[PAY-02]: Cryptographic audit row hash
  // Severity: high | Purpose: Applies cryptographic salt validation to sensitive account logs
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
  });

  // @anchor[PAY-03]: Database ledger query execution
  // Severity: medium | Purpose: Writes final invoice records to SQL payment-logs table
  await db.query("INSERT INTO transactions (id, amount, status) VALUES ($1, $2, $3)", [
    paymentIntent.id,
    amount,
    "completed"
  ]);

  return paymentIntent;
}`
  },
  {
    name: "user-router.ts",
    language: "typescript",
    description: "User profile updates and preferences middleware. (Currently lacks audit hooks or anchor tags).",
    content: `import express from "express";

const router = express.Router();

// FIXME: This entire file is missing tags! It has 0 tags registered in the manifest
router.get("/profile", (req, res) => {
  res.json({ name: "Demo User", email: "user@demo.local" });
});

router.post("/profile", (req, res) => {
  const { name, email } = req.body;
  // TODO: Add database update execution statement here
  res.json({ status: "success", updated: { name, email } });
});

export default router;`
  }
];

export const INITIAL_AN_TAGS: AnchorTag[] = [
  {
    id: "GW-01",
    name: "Gateway Token Guard",
    type: AnchorTagType.SECURITY_CHECK,
    file: "api-gateway.ts",
    purpose: "Ensures all incoming microservice requests are valid.",
    severity: "high",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T10:15:00Z"
  },
  {
    id: "GW-02",
    name: "Gateway Limits Log",
    type: AnchorTagType.PERFORMANCE_CRITICAL,
    file: "api-gateway.ts",
    purpose: "Checks rate limit caps dynamically and reports metrics.",
    severity: "medium",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T10:20:00Z"
  },
  {
    id: "AUTH-01",
    name: "HS256 Token Generator",
    type: AnchorTagType.SECURITY_CHECK,
    file: "auth-service.ts",
    purpose: "Core authentication token generator using HS256 cryptographic hashes.",
    severity: "high",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T11:00:00Z"
  },
  {
    id: "AUTH-02",
    name: "Legacy Login Guard",
    type: AnchorTagType.DEPRECATED_WARNING,
    file: "auth-service.ts",
    purpose: "Obsolete backward compatibility bridge. Scheduled for deprecation in v4.0.",
    severity: "low",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T11:05:00Z"
  },
  {
    id: "PAY-01",
    name: "Stripe Payment Router",
    type: AnchorTagType.EXTERNAL_API,
    file: "payment-handler.ts",
    purpose: "Direct channel connection with Stripe processing gateways.",
    severity: "high",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T12:30:00Z"
  },
  {
    id: "PAY-02",
    name: "Invoicing Hash Salt",
    type: AnchorTagType.DATA_AUDIT,
    file: "payment-handler.ts",
    purpose: "Enforces financial auditing validation on custom balance logs.",
    severity: "high",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T12:35:00Z"
  },
  {
    id: "PAY-03",
    name: "DB Ledger Inserter",
    type: AnchorTagType.DATABASE_QUERY,
    file: "payment-handler.ts",
    purpose: "Inserts transactional receipts directly and flushes standard cash ledgers.",
    severity: "medium",
    createdBy: "joshipv2@gmail.com",
    createdAt: "2026-05-28T12:40:00Z"
  }
];

export const INITIAL_TRIGGERS: TriggerRule[] = [
  {
    id: "TRIG-01",
    name: "Standard Pre-commit Hook Scan",
    event: "git-commit",
    description: "Fires validation rules immediately when local git commit runs to block non-compliant code.",
    isActive: true
  },
  {
    id: "TRIG-02",
    name: "Secure Sandbox PR Builder",
    event: "ci-build",
    description: "Evaluates PR compliance automatically. Flags comments containing undeclared anchors.",
    isActive: true
  },
  {
    id: "TRIG-03",
    name: "Orphaned Tag Weekly Audit",
    event: "weekly-cron",
    description: "Triggers deep scans on files to find and warn about missing anchor tags listed in the manifest.",
    isActive: false
  }
];

export const INITIAL_VARIABLES: TagVariable[] = [
  {
    id: "VAR-01",
    name: "Current Sandbox Environment",
    type: "string",
    value: "development",
    description: "Supplies current execution scope variable to anchor-based testing layers."
  },
  {
    id: "VAR-02",
    name: "Enforce Strict Tag Compliance",
    type: "boolean",
    value: "true",
    description: "When true, blocks Git commits if code lacks anchors on security lines."
  },
  {
    id: "VAR-03",
    name: "Permitted Tag prefixes",
    type: "list",
    value: "GW, AUTH, PAY, DATA, DB, SEC",
    description: "Comma-separated list of recognized code prefix categories for GTM verification."
  }
];
