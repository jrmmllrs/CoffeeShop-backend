const db = require('../config/db');

const inventoryController = {
  getInventoryLogs: async (req, res) => {
    try {
      const { product_id, start_date, end_date } = req.query;

      let query = `
        SELECT il.*, p.name as product_name 
        FROM inventory_logs il 
        JOIN products p ON il.product_id = p.id 
        WHERE 1=1
      `;
      const params = [];

      if (product_id) {
        query += ' AND il.product_id = ?';
        params.push(product_id);
      }

      if (start_date && end_date) {
        query += ' AND DATE(il.created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' ORDER BY il.created_at DESC';

      const [logs] = await db.execute(query, params);
      res.json(logs);
    } catch (error) {
      console.error('Get inventory logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getLowStockProducts: async (req, res) => {
    try {
      const threshold = req.query.threshold || 10;
      
      const [products] = await db.execute(
        'SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC',
        [threshold]
      );

      res.json(products);
    } catch (error) {
      console.error('Get low stock products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = inventoryController;