const express = require('express');
const router = express.Router();
const importController = require('../controllers/import.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', importController.getImportHistory);
router.get('/restore', importController.restoreLatest);
router.delete('/latest', importController.undoLatestImport);

module.exports = router;
