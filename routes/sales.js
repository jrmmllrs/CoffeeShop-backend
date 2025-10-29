const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { auth } = require('../middleware/auth');

router.get('/', auth, saleController.getAllSales);
router.get('/report', auth, saleController.getSalesReport);
router.get('/:id', auth, saleController.getSaleById);
router.post('/', auth, saleController.createSale);

module.exports = router;