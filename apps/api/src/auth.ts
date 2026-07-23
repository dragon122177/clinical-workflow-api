import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest, Role, SessionUser } from "./types.js";

const secret = () => process.env.JWT_SECRET || "careflow-local-demo-secret";
export const signToken = (user: SessionUser) => jwt.sign(user, secret(), { expiresIn: "8h" });

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: "authentication_required" });
  try { req.user = jwt.verify(token, secret()) as SessionUser; next(); }
  catch { return res.status(401).json({ error: "invalid_or_expired_token" }); }
}

export const allow = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "insufficient_permissions" });
  next();
};
