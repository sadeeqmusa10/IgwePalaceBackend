import { NextFunction, Request, Response } from "express";
import * as admin from "firebase-admin";

declare global {
  namespace Express {
    interface Request {
      firebaseId: string;
      email?: string;
      role?: "user" | "admin" | "super-admin";
    }
  }
}

/**
 * Firebase authentication middleware
 * - Verifies ID token
 * - Attaches uid, email, and role (from custom claims)
 */
const firebaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const idToken = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.firebaseId = decodedToken.uid;
    req.email = decodedToken.email || undefined;
    req.role = (decodedToken.role as any) || "user"; // 🔑 FIX

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(403).json({ message: "Invalid or expired token" });
    return;
  }
};

/**
 * Super admin authorization middleware
 * ✅ SECURE: Uses custom claims, not Firestore
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.firebaseId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.role !== "super-admin") {
    res.status(403).json({ message: "Super admin only" });
    return;
  }

  next();
};

/**
 * Admin OR Super Admin middleware (optional but useful)
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.firebaseId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.role !== "admin" && req.role !== "super-admin") {
    res.status(403).json({ message: "Admin only" });
    return;
  }

  next();
};

export { firebaseAuth };
