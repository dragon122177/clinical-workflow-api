import type { Request } from "express";

export type Role = "ADMIN" | "CLINICIAN" | "RECEPTIONIST";
export type SessionUser = { id: string; name: string; email: string; role: Role };
export type AuthRequest = Request & { user?: SessionUser };
