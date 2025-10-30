const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { auth } = require('../middleware/auth');

router.get('/', auth, saleController.getAllSales);
router.get('/report', auth, saleController.getSalesReport);
router.get('/payment-analytics', auth, saleController.getPaymentMethodAnalytics);
router.get('/hourly-sales', auth, saleController.getHourlySales);
router.get('/category-sales', auth, saleController.getCategorySales);
router.get('/:id', auth, saleController.getSaleById);
router.post('/', auth, saleController.createSale);

module.exports = router;