// controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const userController = {
  getAllUsers: async (req, res) => {
    try {
      // First, check the actual column names in your users table
      const [users] = await db.execute(
        'SELECT id, name, username, created_at FROM users ORDER BY created_at DESC'
      );
      
      // If you don't have a role column, add a default role for the response
      const usersWithRole = users.map(user => ({
        ...user,
        role: 'cashier' // Default role since column doesn't exist
      }));
      
      res.json(usersWithRole);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const [users] = await db.execute(
        'SELECT id, name, username, created_at FROM users WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add default role
      const user = {
        ...users[0],
        role: 'cashier'
      };

      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  createUser: async (req, res) => {
    try {
      const { name, username, password, role } = req.body;

      // Validate required fields
      if (!name || !username || !password) {
        return res.status(400).json({ error: 'Name, username, and password are required' });
      }

      // Check if username already exists
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user (without role column)
      const [result] = await db.execute(
        'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)',
        [name, username, passwordHash]
      );

      // Get the created user
      const [newUser] = await db.execute(
        'SELECT id, name, username, created_at FROM users WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: {
          ...newUser[0],
          role: role || 'cashier' // Add role in response
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, password } = req.body;

      let query = 'UPDATE users SET name = ?';
      const params = [name];

      // If password is provided, update it
      if (password) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        query += ', password_hash = ?';
        params.push(passwordHash);
      }

      query += ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent user from deleting their own account
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all cashiers - FIXED: Remove role filter since column doesn't exist
  getCashiers: async (req, res) => {
    try {
      // Since we don't have role column, return all users as cashiers
      // Or modify this based on your actual business logic
      const [users] = await db.execute(
        'SELECT id, name, username, created_at FROM users ORDER BY name'
      );
      
      // Add default role for response
      const cashiers = users.map(user => ({
        ...user,
        role: 'cashier'
      }));
      
      res.json(cashiers);
    } catch (error) {
      console.error('Get cashiers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController;