import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getAllUsage,
  DAILY_LIMITS,
} from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { createRateLimit } from "../middlewares/rateLimit";

const router: Router = Router();

const ADMIN_EMAILS = new Set<string>([
  "msulikowski96@gmail.com",
]);

const authBruteforceLimit = createRateLimit({
  windowMs: 60_000,
  max: 10,
  message: "Zbyt wiele prób logowania. Spróbuj za chwilę.",
});

const emailSchema = z.string().trim().toLowerCase().email("Nieprawidłowy adres email").max(200);
const passwordSchema = z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(200);

// POST /api/auth/register
router.post("/register", authBruteforceLimit, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      email: emailSchema,
      password: passwordSchema,
      displayName: z.string().trim().min(1).max(60).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", message: parsed.error.issues[0]?.message ?? "Błąd walidacji" });
      return;
    }
    const { email, password, displayName } = parsed.data;

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "email_taken", message: "Ten email jest już zarejestrowany." });
      return;
    }

    const passwordHash = await hashPassword(password);
    const isAdmin = ADMIN_EMAILS.has(email);
    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, displayName: displayName ?? null, isAdmin })
      .returning();

    const token = signSession(user!);
    setSessionCookie(res, token);
    res.json({
      user: { id: user!.id, email: user!.email, displayName: user!.displayName, isAdmin: user!.isAdmin },
      limits: DAILY_LIMITS,
    });
  } catch (e: any) {
    console.error("[auth/register]", e);
    res.status(500).json({ error: "server_error", message: e?.message ?? "Błąd serwera" });
  }
});

// POST /api/auth/login
router.post("/login", authBruteforceLimit, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", message: "Podaj email i hasło" });
      return;
    }
    const { email, password } = parsed.data;

    const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.isActive) {
      res.status(401).json({ error: "invalid_credentials", message: "Nieprawidłowy email lub hasło." });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials", message: "Nieprawidłowy email lub hasło." });
      return;
    }

    // Auto-promote admin emails (in case row exists from before whitelist update)
    const shouldBeAdmin = ADMIN_EMAILS.has(user.email);
    const updates: { lastLoginAt: Date; isAdmin?: boolean } = { lastLoginAt: new Date() };
    if (shouldBeAdmin && !user.isAdmin) {
      updates.isAdmin = true;
      user.isAdmin = true;
    }
    await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

    const token = signSession(user);
    setSessionCookie(res, token);
    res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin },
      limits: DAILY_LIMITS,
    });
  } catch (e: any) {
    console.error("[auth/login]", e);
    res.status(500).json({ error: "server_error", message: e?.message ?? "Błąd serwera" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.uid)).limit(1);
    const user = rows[0];
    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ error: "unauthorized", message: "Sesja wygasła" });
      return;
    }
    const usage = await getAllUsage(user.id);
    res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin },
      usage,
      limits: DAILY_LIMITS,
    });
  } catch (e: any) {
    console.error("[auth/me]", e);
    res.status(500).json({ error: "server_error", message: e?.message ?? "Błąd serwera" });
  }
});

export default router;
