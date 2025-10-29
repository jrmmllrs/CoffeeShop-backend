const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');

router.get('/logs', auth, inventoryController.getInventoryLogs);
router.get('/low-stock', auth, inventoryController.getLowStockProducts);

module.exports = router;