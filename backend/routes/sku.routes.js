const express = require('express');
const router = express.Router();
const skuController = require('../controllers/sku.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Protect all routes with auth middleware
router.use(authMiddleware);

router.post('/', skuController.createSku);
router.post('/bulk', skuController.createBulkSkus);
router.get('/', skuController.getUserSkus);


module.exports = router;
