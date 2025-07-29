const UserModel = require('../models/UserModel');
const PendingUserModel = require('../models/PendingUserModel');

function getRegisterPage(req, res) {
    res.render('register', {
        title: 'Register',
        page_css: 'form.css',
        error: null
    });
}

function getLoginPage(req, res) {
    res.render('login', {
        title: 'Login',
        page_css: 'form.css',
        error: null
    });
}

async function registerUser(req, res) {
    try {
        const { username, password } = req.body;
        const existingUser = await UserModel.findOne({ username: username });
        if (existingUser) {
            return res.render('register', { title: 'Register', page_css: 'form.css', error: 'Username already exists.' });
        }
        const newUser = new UserModel({ username, password });
        await newUser.save();
        req.flash('success_msg', 'Registration successful! Please log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.render('register', { title: 'Register', page_css: 'form.css', error: 'Something went wrong.' });
    }
}

function loginUser(req, res) {
    const redirectUrl = req.session.returnTo || (req.user.role === 'admin' ? '/admin/dashboard' : '/');

    delete req.session.returnTo;

    res.redirect(redirectUrl);
}

async function manageUsers(req, res) {
    try {
        const users = await UserModel.find({}).sort({ createdAt: -1 });
        const pendingUsers = await PendingUserModel.find({}).sort({ requestedAt: -1 });
        res.render('admin_users', { users, pendingUsers });
    } catch (err) {
        console.error("Error fetching users for admin panel:", err);
        req.flash('error_msg', 'Could not load user data.');
        res.redirect('/admin/dashboard');
    }
}

async function createUser(req, res) {
    try {
        const { username, password, role } = req.body;
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            req.flash('error_msg', 'Username already exists.');
            return res.redirect('/admin/users');
        }
        const newUser = new UserModel({ username, password, role });
        await newUser.save();
        req.flash('success_msg', 'User created successfully.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error creating user.');
        res.redirect('/admin/users');
    }
}

async function updateUserRole(req, res) {
    try {
        await UserModel.findByIdAndUpdate(req.params.id, { role: req.body.role });
        req.flash('success_msg', 'User role updated.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error updating user role.');
        res.redirect('/admin/users');
    }
}

async function updateUserName(req, res) {
    try {
        const { newUsername, newDisplayName } = req.body;
        await UserModel.findByIdAndUpdate(req.params.id, {
            username: newUsername,
            displayName: newDisplayName
        });
        req.flash('success_msg', 'User name updated.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error updating name.');
        res.redirect('/admin/users');
    }
}

async function unlinkGoogle(req, res) {
    try {
        const user = await UserModel.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }
        if (!user.username && user.displayName) {
            user.username = user.displayName;
        }
        user.googleId = undefined;
        user.displayName = undefined;
        await user.save();
        req.flash('success_msg', 'Google account unlinked successfully.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error unlinking account.');
        res.redirect('/admin/users');
    }
}

async function deleteUser(req, res) {
    try {
        await UserModel.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'User deleted successfully.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error deleting user.');
        res.redirect('/admin/users');
    }
}

async function approveUser(req, res) {
    try {
        const pendingUser = await PendingUserModel.findById(req.params.id);
        if (pendingUser) {
            const newUser = new UserModel({
                googleId: pendingUser.googleId,
                displayName: pendingUser.displayName,
                role: req.body.role
            });
            await newUser.save();
            await PendingUserModel.findByIdAndDelete(req.params.id);
            req.flash('success_msg', 'User approved and created.');
        }
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error approving user.');
        res.redirect('/admin/users');
    }
}

async function rejectUser(req, res) {
    try {
        await PendingUserModel.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Pending user request rejected.');
        res.redirect('/admin/users');
    } catch (err) {
        req.flash('error_msg', 'Error rejecting user.');
        res.redirect('/admin/users');
    }
}

module.exports = {
    getRegisterPage,
    getLoginPage,
    registerUser,
    loginUser,
    manageUsers,
    createUser,
    updateUserRole,
    updateUserName,
    unlinkGoogle,
    deleteUser,
    approveUser,
    rejectUser
};