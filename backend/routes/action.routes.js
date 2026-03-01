const express = require('express');
const router = express.Router();
const actionController = require('../controllers/action.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', actionController.getActions);
router.post('/', actionController.saveAction);
router.delete('/:id', actionController.deleteAction);

module.exports = router;
