const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const UserModel = require('../models/UserModel');
const PendingUserModel = require('../models/PendingUserModel');

module.exports = function (passport) {

	passport.use(new LocalStrategy(
		async function (username, password, done) {
			try {
				const user = await UserModel.findOne({ username: username });
				if (!user) {
					return done(null, false, { message: 'USER_NOT_FOUND' });
				}

				user.comparePassword(password, (err, isMatch) => {
					if (err) return done(err);
					if (isMatch) {
						return done(null, user);
					} else {
						return done(null, false, { message: 'Incorrect password.' });
					}
				});
			} catch (err) { return done(err); }
		}
	));

	// --- Google OAuth 2.0 Strategy ---
	passport.use(new GoogleStrategy({
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: '/auth/google/callback',
		passReqToCallback: true
	},
		async function (req, accessToken, refreshToken, profile, done) {
			try {
				// SCENARIO 1: Admin is linking an account
				if (req.query.state) {
					const userToLink = await UserModel.findById(req.query.state);
					if (userToLink) {
						userToLink.googleId = profile.id;
						userToLink.displayName = profile.displayName;
						await userToLink.save();
						return done(null, userToLink);
					}
				}

				// SCENARIO 2: Regular login for an existing user
				const user = await UserModel.findOne({ googleId: profile.id });
				if (user) {
					return done(null, user);
				}

				// SCENARIO 3: New Google user -> add to pending list
				let pendingUser = await PendingUserModel.findOne({ googleId: profile.id });
				if (!pendingUser) {
					pendingUser = await PendingUserModel.create({
						googleId: profile.id,
						displayName: profile.displayName
					});
				}

				// Tell Passport the login failed for now, but pass a message
				return done(null, false, { message: 'Your account is awaiting administrator approval.' });

			} catch (err) {
				return done(err);
			}
		}
	));

	// --- Session Management ---
	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(async function (id, done) {
		try {
			const user = await UserModel.findById(id);
			done(null, user);
		} catch (err) {
			done(err, null);
		}
	});

};