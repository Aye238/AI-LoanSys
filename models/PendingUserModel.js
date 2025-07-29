const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
	googleId: {
		type: String,
		required: true,
		unique: true,
	},
	displayName: {
		type: String,
		required: true,
	},
	requestedAt: {
		type: Date,
		default: Date.now
	}
});

const PendingUserModel = mongoose.model('PendingUser', PendingUserSchema);
module.exports = PendingUserModel;