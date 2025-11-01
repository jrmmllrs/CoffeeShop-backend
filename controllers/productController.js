const db = require('../config/db');

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const [products] = await db.execute(`
        SELECT 
          p.*,
          COALESCE(SUM(si.quantity), 0) as sales_count
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY p.name
      `);
      
      res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const [products] = await db.execute(
        'SELECT * FROM products WHERE id = ? AND is_active = 1',
        [id]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(products[0]);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  createProduct: async (req, res) => {
    try {
      const { name, price, stock, category, image } = req.body;

      if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' });
      }

      const [result] = await db.execute(
        'INSERT INTO products (name, price, stock, category, image, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [name, parseFloat(price), parseInt(stock) || 0, category, image]
      );

      if (parseInt(stock) > 0) {
        await db.execute(
          'INSERT INTO inventory_logs (product_id, change_amount, note) VALUES (?, ?, ?)',
          [result.insertId, parseInt(stock), 'Initial stock']
        );
      }

      res.status(201).json({
        message: 'Product created successfully',
        product: {
          id: result.insertId,
          name,
          price: parseFloat(price),
          stock: parseInt(stock) || 0,
          category,
          image,
          is_active: 1
        }
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, stock, category, image } = req.body;

      const [result] = await db.execute(
        'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, image = ? WHERE id = ? AND is_active = 1',
        [name, parseFloat(price), parseInt(stock), category, image, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product updated successfully' });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if product exists and is active
      const [products] = await db.execute(
        'SELECT * FROM products WHERE id = ? AND is_active = 1',
        [id]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Soft delete - mark as inactive instead of deleting
      const [result] = await db.execute(
        'UPDATE products SET is_active = 0 WHERE id = ?',
        [id]
      );

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      
      // Handle any foreign key constraint errors (just in case)
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ 
          error: 'Cannot delete this product because it has been used in sales transactions.' 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { change_amount, note } = req.body;

      const [products] = await db.execute(
        'SELECT stock FROM products WHERE id = ? AND is_active = 1',
        [id]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const currentStock = products[0].stock;
      const newStock = currentStock + parseInt(change_amount);

      await db.execute(
        'UPDATE products SET stock = ? WHERE id = ?',
        [newStock, id]
      );

      await db.execute(
        'INSERT INTO inventory_logs (product_id, change_amount, note) VALUES (?, ?, ?)',
        [id, parseInt(change_amount), note || 'Stock adjustment']
      );

      res.json({ 
        message: 'Stock updated successfully',
        newStock 
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = productController;