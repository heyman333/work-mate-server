import passport from "passport";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { UserModel, User } from "../models/User";

declare global {
  namespace Express {
    interface User {
      _id?: import("mongodb").ObjectId;
      email: string;
      name: string;
      profileImage?: string;
      githubId?: string;
      googleId?: string;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt?: Date;
    }
  }
}

passport.serializeUser((user: Express.User, done) => {
  done(null, user._id?.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user || undefined);
  } catch (error) {
    done(error, undefined);
  }
});

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/auth/github/callback",
      },
    async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: (error: any, user?: Express.User | false) => void) => {
      try {
        let user = await UserModel.findByGithubId(profile.id);

        if (user) {
          await UserModel.updateLastLogin(user._id!);
          return done(null, user);
        }

        const existingUser = await UserModel.findByEmail(profile.emails?.[0]?.value || "");
        if (existingUser) {
          const updatedUser = await UserModel.update(existingUser._id!, {
            githubId: profile.id,
            profileImage: profile.photos?.[0]?.value,
          });
          return done(null, updatedUser || false);
        }

        user = await UserModel.create({
          email: profile.emails?.[0]?.value || "",
          name: profile.displayName || profile.username || "",
          profileImage: profile.photos?.[0]?.value,
          githubId: profile.id,
        });

        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
    )
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
    async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: (error: any, user?: Express.User | false) => void) => {
      try {
        let user = await UserModel.findByGoogleId(profile.id);

        if (user) {
          await UserModel.updateLastLogin(user._id!);
          return done(null, user);
        }

        const existingUser = await UserModel.findByEmail(profile.emails?.[0]?.value || "");
        if (existingUser) {
          const updatedUser = await UserModel.update(existingUser._id!, {
            googleId: profile.id,
            profileImage: profile.photos?.[0]?.value,
          });
          return done(null, updatedUser || false);
        }

        user = await UserModel.create({
          email: profile.emails?.[0]?.value || "",
          name: profile.displayName || "",
          profileImage: profile.photos?.[0]?.value,
          googleId: profile.id,
        });

        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
    )
  );
}

export default passport;