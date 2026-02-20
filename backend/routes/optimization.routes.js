const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimization.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/insights', optimizationController.getOptimizationInsights);

module.exports = router;
