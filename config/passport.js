// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { User, StudentProfile, Lead } = require('../models');
const jwt = require('jsonwebtoken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/v1/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // console.log(profile, "aksckasmsmkasacmas");

        const email = profile.emails[0].value;
        let user = await User.findOne({ where: { email } });

        // If user doesn't exist, create one (default to student)
        if (!user) {
          user = await User.create({
            email,
            name: profile.displayName,
            role: 'student',
            isActive: true,
            signupLocation: 'Google OAuth',
          });

          // Create StudentProfile
          await StudentProfile.create({
            userId: user.id,
            personalInfo: {},
            educationalBackground: {},
            studyPreferences: {},
          });

          // Create Lead
          await Lead.create({
            studentId: user.id,
            officeId: null,
            source: 'online',
            assignedConsultant: null,
            studyPreferences: {},
            history: [
              {
                timestamp: new Date().toISOString(),
                action: 'Lead created from student signup',
              },
            ],
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// // facebook start
// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FACEBOOK_APP_ID,
//       clientSecret: process.env.FACEBOOK_APP_SECRET,
//       callbackURL: '/api/v1/auth/facebook/callback',
//       profileFields: [
//         'id',
//         'emails',
//         'name',
//         'displayName',
//         'picture.type(large)',
//       ],
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         console.log('Facebook profile:', profile); // inspect available fields

//         const email = profile.emails?.[0]?.value;
//         const fullName =
//           profile.displayName ||
//           `${profile.name.givenName} ${profile.name.familyName}`;

//         let user = await User.findOne({ where: { email } });

//         if (!user) {
//           user = await User.create({
//             email,
//             name: fullName,
//             role: 'student',
//             isActive: true,
//           });
//         }

//         return done(null, user);
//       } catch (err) {
//         return done(err, null);
//       }
//     }
//   )
// );

// facebook end

// (Optional) if using sessions, serialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findByPk(id);
  done(null, user);
});
