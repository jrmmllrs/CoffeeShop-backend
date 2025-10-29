const db = require('../config/db');

const userController = {
  getAllUsers: async (req, res) => {
    try {
      const [users] = await db.execute(
        'SELECT id, name, username, role, created_at FROM users ORDER BY created_at DESC'
      );
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const [users] = await db.execute(
        'SELECT id, name, username, role, created_at FROM users WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(users[0]);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role } = req.body;

      const [result] = await db.execute(
        'UPDATE users SET name = ?, role = ? WHERE id = ?',
        [name, role, id]
      );

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
  }
};

module.exports = userController;