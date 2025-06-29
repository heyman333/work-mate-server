import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  userId: string;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id?: import("mongodb").ObjectId;
        email: string;
        name: string;
        profileImage?: string;
        githubId?: string;
        googleId?: string;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt?: Date;
      };
      isAuthenticated?: () => boolean;
    }
  }
}

const generateToken = (userId: string): string => {
  const payload = {
    userId,
    iat: Date.now(),
  };

  const expiresIn = "24h";

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const setCookieWithToken = (res: Response, userId: string): void => {
  const token = generateToken(userId);

  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      req.user = undefined;
      req.isAuthenticated = () => false;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      req.user = undefined;
      req.isAuthenticated = () => false;
      return next();
    }

    const tokenIssuedAt = decoded.iat;
    const currentTime = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (currentTime - tokenIssuedAt <= twoHoursInMs) {
      setCookieWithToken(res, decoded.userId);
    }

    req.user = user;
    req.isAuthenticated = () => true;
    next();
  } catch (error) {
    req.user = undefined;
    req.isAuthenticated = () => false;
    next();
  }
};