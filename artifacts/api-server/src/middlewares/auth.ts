import type { Request, Response, NextFunction } from "express";
import {
  readSessionCookie,
  verifySession,
  getUsageCount,
  incrementUsage,
  DAILY_LIMITS,
  FEATURE_LABELS,
  type FeatureKey,
  type SessionPayload,
} from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = readSessionCookie(req);
  if (token) {
    const payload = verifySession(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized", message: "Musisz się zalogować, aby korzystać z tej funkcji." });
    return;
  }
  next();
}

export function requireUsage(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized", message: "Musisz się zalogować, aby korzystać z tej funkcji." });
      return;
    }
    if (req.user.isAdmin) {
      next();
      return;
    }
    try {
      const used = await getUsageCount(req.user.uid, feature);
      const limit = DAILY_LIMITS[feature];
      if (used >= limit) {
        res.status(429).json({
          error: "daily_limit_reached",
          message: `Wykorzystałeś dzienny limit (${limit}) dla: ${FEATURE_LABELS[feature]}. Limit zresetuje się o północy UTC.`,
          feature,
          used,
          limit,
        });
        return;
      }
      // increment BEFORE the heavy work (so failures still count? -> we increment AFTER success via res.on("finish"))
      let counted = false;
      const onFinish = async (): Promise<void> => {
        if (counted) return;
        counted = true;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          try {
            await incrementUsage(req.user!.uid, feature);
          } catch (e) {
            console.error("[usage] increment failed:", e);
          }
        }
      };
      res.on("finish", () => void onFinish());
      next();
    } catch (e: any) {
      console.error("[requireUsage] error:", e);
      res.status(500).json({ error: "usage_check_failed", message: e?.message ?? "Błąd sprawdzania limitu." });
    }
  };
}
