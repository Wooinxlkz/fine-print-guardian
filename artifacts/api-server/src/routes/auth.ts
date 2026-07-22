import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getSecret } from "../middlewares/auth";

const router = Router();

async function signToken(sub: string, email: string): Promise<string> {
  return new SignJWT({ sub, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

// POST /auth/register
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body ?? {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ email: normalizedEmail, passwordHash, name: name?.trim() || null })
    .returning();

  const token = await signToken(String(user.id), user.email);
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// POST /auth/login
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = await signToken(String(user.id), user.email);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// POST /auth/logout — client-side token removal; server just confirms
router.post("/auth/logout", (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

// GET /auth/me — returns the current user profile
router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  if (userId.startsWith("guest_")) {
    res.json({ id: userId, email: null, name: "Guest", isGuest: true, createdAt: null });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(userId, 10)));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, isGuest: false });
});

export default router;
