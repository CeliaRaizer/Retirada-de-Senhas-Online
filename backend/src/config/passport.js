const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {

    const usuario = {
        googleId: profile.id,
        nome: profile.displayName,
        email: profile.emails[0].value,
        foto: profile.photos && profile.photos[0] ? profile.photos[0].value : null
    };

    return done(null, usuario);
}));