const passport = require('passport');

module.exports = {
	ensureAuth: function (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		} else {
			req.session.returnTo = req.originalUrl;
			req.flash('error_msg', 'You must be logged in to view that page.');
			res.redirect('/auth/login');
		}
	},

	ensureGuest: function (req, res, next) {
		if (!req.isAuthenticated()) {
			return next();
		} else {
			const redirectUrl = req.user.role === 'admin' ? '/admin/dashboard' : '/';
			res.redirect(redirectUrl);
		}
	},

	ensureAdmin: function (req, res, next) {
		if (req.user && req.user.role === 'admin') {
			return next();
		} else {
			req.flash('error_msg', 'You do not have permission to view this page.');
			res.redirect('/');
		}
	}
};