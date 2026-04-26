'use strict';

const router     = require('express').Router();
const ctrl       = require('../controllers/userController');
const { loginRules } = require('../middleware/validator');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, ctrl.login);

module.exports = router;
