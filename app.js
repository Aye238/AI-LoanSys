const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const connectDB = require('./config/db');
const UserModel = require('./models/UserModel');

const startServer = async () => {
	dotenv.config();

	await connectDB();

	try {
		const existingAdmin = await UserModel.findOne({ role: 'admin' });
		if (existingAdmin) {
			console.log('Admin user verified.');
		} else {
			console.log('No admin user found. Creating default admin account...');
			const defaultAdmin = new UserModel({
				username: 'admin',
				password: 'password',
				role: 'admin'
			});
			await defaultAdmin.save();
			console.log('Default admin user created (username: admin, password: password)');
		}
	} catch (error) {
		console.error('Critical error during admin account initialization:', error);
		process.exit(1);
	}

	require('./auth/passport-config')(passport);
	const app = express();
	const server = http.createServer(app);
	const io = new Server(server);

	app.use(morgan('dev'));
	app.use(express.json());

	app.use(express.urlencoded({ extended: false }));
	app.use(express.static(path.join(__dirname, 'public')));
	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, 'views'));

	app.use(session({
		secret: process.env.SESSION_SECRET || 'a-very-secret-key',
		resave: false,
		saveUninitialized: true,
		cookie: { secure: false }
	}));

	app.use(flash());
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(function (req, res, next) {
		res.locals.user = req.user || null;
		res.locals.success_msg = req.flash('success_msg');
		res.locals.error_msg = req.flash('error_msg');
		next();
	});

	app.use('/auth', require('./routes/authRoutes'));
	app.use('/admin', require('./routes/adminRoutes')(io));
	app.use('/', require('./routes/loanRoutes'));

	app.use(function (req, res, next) {
		const error = new Error('Page Not Found');
		error.status = 404;
		next(error);
	});

	app.use(function (err, req, res, next) {
		const statusCode = err.status || 500;
		const message = err.message || 'Something went wrong on the server.';

		res.status(statusCode);

		res.render('error', {
			title: `Error ${statusCode}`,
			statusCode: statusCode,
			message: message,
			error: process.env.NODE_ENV === 'development' ? err : {},
			page_css: 'error.css',
			body_class: 'page-error'
		});
	});

	const PORT = process.env.PORT || 3000;
	server.listen(PORT, function () {
		console.log(`🚀 Server is running on http://localhost:${PORT}`);
	});
};

startServer();