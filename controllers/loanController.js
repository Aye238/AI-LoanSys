const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const { validationResult } = require('express-validator');
const LoanModel = require('../models/LoanModel');

function getHomepage(req, res) {
	res.render('index', {
		title: 'Welcome to AI LoanSys',
		page_css: 'style.css',
		body_class: 'page-index',
		isHomepage: true
	});
}

function getLoanForm(req, res) {
	res.render('form', {
		title: 'New Loan Application',
		page_css: 'form.css',
		body_class: 'page-application-form',
		formData: {},
		errors: []
	});
}

function submitLoanForm(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.render('form', {
			title: 'Loan Application Form - Error',
			page_css: 'form.css',
			body_class: 'page-application-form',
			errors: errors.array(),
			formData: req.body
		});
	}

	const { creditScore, annualIncome, loanAmount, employmentType } = req.body;
	const scriptPath = path.join(__dirname, '..', 'python', 'ai_model', 'predict.py');
	const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
	const pythonProcess = spawn(pythonCommand, [scriptPath, String(creditScore), String(annualIncome), String(loanAmount), String(employmentType)]);
	let pythonResponse = '';
	pythonProcess.stdout.on('data', (data) => { pythonResponse += data.toString(); });
	pythonProcess.stderr.on('data', (data) => { console.error('STDERR from Python script:', data.toString()); });
	pythonProcess.on('close', () => {
		try {
			if (!pythonResponse) { throw new Error("Python script returned an empty response."); }
			const aiResult = JSON.parse(pythonResponse);
			if (aiResult.error) { throw new Error(aiResult.details || aiResult.error); }
			const { riskClass, explanation, anomaly, suggestion } = aiResult;
			let finalDecision = '';
			let detailedReason = explanation;
			if (anomaly && anomaly.detected) {
				finalDecision = 'Needs Review';
				detailedReason = anomaly.reason;
			} else {
				switch (riskClass) {
					case 'Prime': case 'Standard': finalDecision = 'Auto-Approved'; break;
					case 'Sub-prime': case 'High Risk': finalDecision = 'Auto-Rejected'; break;
					default: finalDecision = 'Needs Review';
				}
			}
			const newApplication = new LoanModel({ creditScore, annualIncome, loanAmount, employmentType, riskClass, finalDecision });
			newApplication.save().catch(err => console.error('DB Save Error:', err));
			res.render('result', { title: 'Application Result', page_css: 'result.css', decision: finalDecision, reason: detailedReason, suggestion: suggestion, submittedData: req.body });
		} catch (error) {
			console.error('Error processing Python response:', error, 'Raw response:', pythonResponse);
			res.render('error', { title: 'Processing Error', page_css: 'error.css', statusCode: 500, message: 'There was an error processing the AI response.', error: error });
		}
	});
}

function getHistory(req, res) {
	const page = parseInt(req.query.page) || 1;
	const itemsPerPage = 10;

	const query = {};
	if (req.query.decision && req.query.decision !== '') {
		query.finalDecision = req.query.decision;
	}
	if (req.query.minAmount) {
		query.loanAmount = { ...query.loanAmount, $gte: parseInt(req.query.minAmount) };
	}
	if (req.query.maxAmount) {
		query.loanAmount = { ...query.loanAmount, $lte: parseInt(req.query.maxAmount) };
	}

	let totalItems;

	LoanModel.countDocuments(query)
		.then(count => {
			totalItems = count;
			return LoanModel.find(query)
				.sort({ applicationDate: -1 })
				.skip((page - 1) * itemsPerPage)
				.limit(itemsPerPage);
		})
		.then(applications => {
			res.render('history', {
				title: 'Application History',
				page_css: 'history.css',
				user: req.user,
				applications: applications,
				currentPage: page,
				hasNextPage: itemsPerPage * page < totalItems,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalItems / itemsPerPage),
				query: req.query
			});
		})
		.catch(err => {
			console.error('Error fetching history:', err);
			res.status(500).send("Could not retrieve application history.");
		});
}

function getDashboard(req, res) {
	const aiStatus = req.aiStatus;

	if (aiStatus.state !== 'Ready') {
		return res.render('dashboard', {
			aiStatus: aiStatus,
			totalApplications: 0, approvedCount: 0, rejectedCount: 0, reviewCount: 0,
			approvalRate: 'N/A', averageLoanAmount: 0, decisionData: [0, 0, 0]
		});
	}

	LoanModel.find({})
		.then(function (applications) {
			const totalApplications = applications.length;
			if (totalApplications === 0) {
				return res.render('dashboard', {
					aiStatus, totalApplications: 0, approvedCount: 0, rejectedCount: 0, reviewCount: 0,
					approvalRate: '0.0', averageLoanAmount: 0, decisionData: [0, 0, 0]
				});
			}

			let approvedCount = 0, rejectedCount = 0, reviewCount = 0, totalLoanAmount = 0;
			applications.forEach(function (app) {
				totalLoanAmount += app.loanAmount;
				if (app.finalDecision === 'Auto-Approved') approvedCount++;
				else if (app.finalDecision === 'Auto-Rejected') rejectedCount++;
				else reviewCount++;
			});
			const approvalRate = (approvedCount / totalApplications) * 100;
			const averageLoanAmount = totalLoanAmount / totalApplications;
			const decisionData = [approvedCount, reviewCount, rejectedCount];

			res.render('dashboard', {
				aiStatus: aiStatus,
				totalApplications, approvedCount, rejectedCount, reviewCount,
				approvalRate: approvalRate.toFixed(1),
				averageLoanAmount: averageLoanAmount.toFixed(2),
				decisionData
			});
		})
		.catch(function (err) {
			console.error('Error fetching dashboard data:', err);
			req.flash('error_msg', 'Could not load application statistics.');
			res.render('dashboard', {
				aiStatus, totalApplications: 'Error', approvedCount: 'Error', rejectedCount: 'Error', reviewCount: 'Error',
				approvalRate: 'N/A', averageLoanAmount: 'Error', decisionData: [0, 0, 0]
			});
		});
}

module.exports = {
	getHomepage,
	getLoanForm,
	submitLoanForm,
	getHistory,
	getDashboard
};