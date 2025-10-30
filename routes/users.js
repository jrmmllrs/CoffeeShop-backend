const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');

// Admin only routes
router.get('/', auth, adminAuth, userController.getAllUsers);
router.post('/', auth, adminAuth, userController.createUser);
router.get('/:id', auth, adminAuth, userController.getUserById);
router.put('/:id', auth, adminAuth, userController.updateUser);
router.delete('/:id', auth, adminAuth, userController.deleteUser);

// Get cashiers (accessible by any authenticated user for dashboard)
router.get('/cashiers/list', auth, userController.getCashiers);

module.exports = router;