const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
	username: {
		type: String,
	},
	password: {
		type: String,
	},

	googleId: {
		type: String,
		unique: true,
		sparse: true
	},
	displayName: {
		type: String,
	},

	role: {
		type: String,
		enum: ['user', 'admin'],
		default: 'user'
	},

	createdAt: {
		type: Date,
		default: Date.now
	}
});

UserSchema.pre('save', function (next) {
	const user = this;
	if (!user.isModified('password')) return next();

	bcrypt.genSalt(10, function (err, salt) {
		if (err) return next(err);
		bcrypt.hash(user.password, salt, function (err, hash) {
			if (err) return next(err);
			user.password = hash;
			next();
		});
	});
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
};


const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;