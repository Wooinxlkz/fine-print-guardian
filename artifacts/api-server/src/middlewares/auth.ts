import { jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";

const GUEST_ID_RE = /^guest_[a-f0-9]{24,}$/;

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || "dev-fallback-secret-change-in-prod"
  );
}

/**
 * Middleware that accepts either a valid JWT Bearer token OR a guest session ID
 * (X-Guest-Id header). JWT is always checked first.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Try JWT Bearer token
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, getSecret());
      (req as any).userId = String(payload.sub);
      next();
      return;
    } catch {
      // Invalid/expired token — fall through to guest check
    }
  }

  // 2. Fall back to guest session ID header
  const guestId = req.headers["x-guest-id"];
  if (typeof guestId === "string" && GUEST_ID_RE.test(guestId)) {
    (req as any).userId = guestId;
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export { getSecret };
