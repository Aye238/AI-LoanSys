const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureGuest } = require('../auth/authMiddleware');

router.get('/register', ensureGuest, authController.getRegisterPage);

router.post('/register', authController.registerUser);

router.get('/login', ensureGuest, authController.getLoginPage);

router.post('/login', (req, res, next) => {
	passport.authenticate('local', (err, user, info) => {
		if (err) {
			return next(err);
		}

		if (!user) {
			if (info && info.message === 'USER_NOT_FOUND') {
				req.flash('success_msg', 'That user does not exist. Please create an account.');
				return res.redirect('/auth/register');
			} else {
				req.flash('error_msg', info.message || 'Login failed. Please try again.');
				return res.redirect('/auth/login');
			}
		}

		req.logIn(user, (err) => {
			if (err) {
				return next(err);
			}
			return authController.loginUser(req, res);
		});
	})(req, res, next);
});


router.get('/google', passport.authenticate('google', { scope: ['profile'] }));
router.get('/google/callback', (req, res, next) => {
	passport.authenticate('google', (err, user, info) => {
		if (err) {
			return next(err);
		}

		if (!user) {
			req.flash('success_msg', info.message || 'Could not log in with Google.');
			return res.redirect('/auth/login');
		}

		req.logIn(user, (err) => {
			if (err) {
				return next(err);
			}
			if (req.query.state) {
				req.flash('success_msg', 'Google account linked successfully!');
				return res.redirect('/admin/users');

			} else {
				const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/';
				return res.redirect(redirectUrl);
			}
		});
	})(req, res, next);
});

router.get('/logout', (req, res, next) => {
	req.logout(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});


module.exports = router;