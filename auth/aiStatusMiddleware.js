const fs = require('fs');
const path = require('path');

const CORE_SCRIPTS = [
	'python/ai_model/predict.py',
	'python/ai_model/train_model.py',
	'python/ai_model/loan_dataset.csv'
];

const PKL_FILES = [
	'python/ai_model/loan_model.pkl',
	'python/ai_model/suggestion_model.pkl',
	'python/ai_model/label_encoders.pkl',
	'python/ai_model/model_columns.pkl',
	'python/ai_model/data_stats.pkl'
];


module.exports = function (req, res, next) {
	const status = {
		state: 'Critical Failure',
		message: '',
		missingFiles: []
	};

	const basePath = path.join(__dirname, '..');

	const missingCoreFiles = CORE_SCRIPTS.filter(file => !fs.existsSync(path.join(basePath, file)));
	if (missingCoreFiles.length > 0) {
		status.message = `Core AI files are missing: ${missingCoreFiles.join(', ')}. Training is not possible.`;
		req.aiStatus = status;
		return next();
	}

	const pklFilesExistence = PKL_FILES.map(file => fs.existsSync(path.join(basePath, file)));
	const existingPklCount = pklFilesExistence.filter(Boolean).length;

	if (existingPklCount === PKL_FILES.length) {
		status.state = 'Ready';
		status.message = 'The AI model is trained and fully operational.';
	} else if (existingPklCount === 0) {
		status.state = 'Not Initialized';
		status.message = 'The AI model has not been trained yet. Please run the initial training to enable predictions.';
	} else {
		status.state = 'Corrupted';
		const missingPkls = PKL_FILES.filter(file => !fs.existsSync(path.join(basePath, file)));
		status.message = 'Some AI model files (.pkl) are missing, which may cause errors. A retrain is required to fix this.';
		status.missingFiles = missingPkls.map(p => path.basename(p));
	}

	req.aiStatus = status;
	next();
};