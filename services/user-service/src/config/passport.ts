import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: "/api/users/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          console.log("[Google OAuth] Profile received:", profile.id, profile.emails?.[0]?.value);
          let user = await User.findOne({ googleId: profile.id });
          if (user) return done(null, user);
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              await user.save();
              return done(null, user);
            }
          }

      const username = profile.displayName?.replace(/\s+/g, "_").toLowerCase() 
        ?? `google_${profile.id}`;
        const existingUsername = await User.findOne({ username });
        const finalUsername = existingUsername 
          ? `${username}_${Date.now()}` 
          : username;
        const newUser = await User.create({
          googleId: profile.id,
          email: email ?? `${profile.id}@google.noemail`,
          username: finalUsername,
        });

      console.log("[Google OAuth] Created new user:", newUser.email);
      return done(null, newUser);
        } catch (err) {
          console.error("[Google OAuth] Error:", err);
          return done(err);
        }
      },
    ),
  );
} else {
  console.warn("[Auth] Google OAuth disabled — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET has not been set.");
}
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
if (githubClientId && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: "/api/users/auth/github/callback",
        scope: ["user:email"],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          console.log("[GitHub OAuth] Profile received:", profile.id, profile.emails?.[0]?.value);
          let user = await User.findOne({ githubId: profile.id });
          if (user) return done(null, user);
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              user.githubId = profile.id;
              await user.save();
              return done(null, user);
            }
          }
          const username = profile.username?.toLowerCase() 
            ?? `github_${profile.id}`;
          const existingUsername = await User.findOne({ username });
          const finalUsername = existingUsername 
            ? `${username}_${Date.now()}` 
            : username;
        const newUser = await User.create({
          githubId: profile.id,
          email: email ?? `${profile.id}@github.noemail`,
          username: finalUsername,
        });
          console.log("[GitHub OAuth] Created a new user:", newUser.email);
          return done(null, newUser);
        } catch (err) {
          console.error("[GitHub OAuth] Error:", err);
          return done(err);
        }
      },
    ),
  );
} else {
  console.warn("[Auth] GitHub OAuth disabled — GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set.");
}
export default passport;