const express = require('express');
const router = express.Router();
const insightsController = require('../controllers/insights.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/financial', insightsController.getFinancialInsights);

module.exports = router;
