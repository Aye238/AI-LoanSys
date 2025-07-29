const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
	creditScore: {
		type: Number,
		required: true
	},
	annualIncome: {
		type: Number,
		required: true
	},
	loanAmount: {
		type: Number,
		required: true
	},
	employmentType: {
		type: String,
		required: true
	},

	aiRiskScore: {
		type: Number,
		required: false
	},

	riskClass: {
		type: String,
		required: false
	},

	finalDecision: {
		type: String,
		required: true,
		enum: ['Auto-Approved', 'Auto-Rejected', 'Needs Review']
	},

	applicationDate: {
		type: Date,
		default: Date.now
	}
});

const LoanModel = mongoose.model('LoanModel', loanSchema);
module.exports = LoanModel;