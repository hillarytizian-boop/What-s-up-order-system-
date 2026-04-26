'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/me', ctrl.me);
router.get('/',   requireAdmin, ctrl.index);
router.patch('/:phone/block',   requireAdmin, ctrl.block);
router.patch('/:phone/unblock', requireAdmin, ctrl.unblock);

module.exports = router;
