import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User, { Role } from "../models/User";

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
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            const email = profile.emails?.[0]?.value;
            user = await User.findOne({ email });

            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              return done(null, false, { message: "No account found. Please register first."});
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
} else {
  console.warn(
    "[Auth] Google OAuth disabled — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.",
  );
}

export default passport;