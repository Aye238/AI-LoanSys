const os = require('os');
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const passport = require('passport');
const { ensureAuth, ensureAdmin } = require('../auth/authMiddleware');
const LoanModel = require('../models/LoanModel');
const authController = require('../controllers/authController');

module.exports = function (io) {

    router.get('/users', ensureAuth, ensureAdmin, authController.manageUsers);

    router.get('/retrain', ensureAuth, ensureAdmin, (req, res) => {
        const isInitial = req.query.initial === 'true';
        res.render('retrain_live', { isInitialTrain: isInitial });
    });

    router.post('/override/:id', ensureAuth, ensureAdmin, async (req, res) => {
        try {
            const { newDecision } = req.body;
            await LoanModel.findByIdAndUpdate(req.params.id, { finalDecision: newDecision });
            req.flash('success_msg', 'Application decision has been successfully updated.');
            res.redirect('/admin/history');
        } catch (err) {
            console.error('Error overriding application decision:', err);
            req.flash('error_msg', 'An error occurred while updating the application.');
            res.redirect('/admin/history');
        }
    });

    router.post('/users/create', ensureAuth, ensureAdmin, authController.createUser);

    router.post('/users/update-role/:id', ensureAuth, ensureAdmin, authController.updateUserRole);

    router.post('/users/update-name/:id', ensureAuth, ensureAdmin, authController.updateUserName);

    router.post('/users/unlink-google/:id', ensureAuth, ensureAdmin, authController.unlinkGoogle);

    router.post('/users/delete/:id', ensureAuth, ensureAdmin, authController.deleteUser);

    router.post('/users/approve/:id', ensureAuth, ensureAdmin, authController.approveUser);

    router.post('/users/reject/:id', ensureAuth, ensureAdmin, authController.rejectUser);

    router.get('/users/link-google/:id', ensureAuth, ensureAdmin, (req, res, next) => {
        passport.authenticate('google', {
            scope: ['profile'],
            state: req.params.id
        })(req, res, next);
    });

    router.post('/retrain', ensureAuth, ensureAdmin, (req, res) => {
        const { socketId, isInitialTrain } = req.body;
        if (!socketId) {
            return res.status(400).json({ message: 'Socket ID is required.' });
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'ai_model', 'train_model.py');
        const scriptArgs = [];

        if (isInitialTrain === false) {
            scriptArgs.push('--retrain');
        }

        const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
        const pythonProcess = spawn(pythonCommand, [scriptPath, ...scriptArgs]);

        res.json({ message: 'Training process started successfully.' });

        let delay = 0;
        const delayIncrement = 100;

        const sendWithDelay = (message) => {
            setTimeout(() => {
                io.to(socketId).emit('log_line', message);
            }, delay);
            delay += delayIncrement;
        };

        pythonProcess.stdout.on('data', (data) => {
            data.toString().trim().split('\n').forEach(line => sendWithDelay({ type: 'stdout', line: line }));
        });

        pythonProcess.stderr.on('data', (data) => {
            data.toString().trim().split('\n').forEach(line => sendWithDelay({ type: 'stderr', line: line }));
        });

        pythonProcess.on('close', (code) => {
            setTimeout(() => {
                io.to(socketId).emit('process_finished', { exitCode: code });
            }, delay + 500);
        });
    });

    return router;
};