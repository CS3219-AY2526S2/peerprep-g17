import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import User, { Role } from "../models/User"

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/users/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id })

        if (!user) {
          const email = profile.emails?.[0]?.value
          user = await User.findOne({ email })

          if (user) {
            user.googleId = profile.id
            await user.save()
          } else {
            user = await User.create({
              googleId: profile.id,
              email,
              username: profile.displayName?.replace(/\s+/g, "") || `user_${profile.id.slice(0, 8)}`,
              role: Role.USER,
            })
          }
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

export default passport