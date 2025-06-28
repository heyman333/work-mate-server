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

    req.user = user;
    req.isAuthenticated = () => true;
    next();
  } catch (error) {
    req.user = undefined;
    req.isAuthenticated = () => false;
    next();
  }
};