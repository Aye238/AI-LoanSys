const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { body } = require('express-validator');
const { ensureAuth, ensureGuest, ensureAdmin } = require('../auth/authMiddleware');
const aiStatusMiddleware = require('../auth/aiStatusMiddleware');

router.get('/', loanController.getHomepage);

router.get('/form', ensureAuth, loanController.getLoanForm);

router.post('/submit', ensureAuth, [], loanController.submitLoanForm);

router.get('/admin/history', ensureAuth, ensureAdmin, loanController.getHistory);

router.get('/admin/dashboard', ensureAuth, ensureAdmin, aiStatusMiddleware, loanController.getDashboard);

module.exports = router;