'use strict';

const router = require('express').Router();

router.use('/auth',     require('./authRoutes'));
router.use('/orders',   require('./orderRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/users',    require('./userRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/bot',      require('./botRoutes'));

module.exports = router;
