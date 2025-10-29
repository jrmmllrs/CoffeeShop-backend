const db = require('../config/db');

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const [products] = await db.execute(
        'SELECT * FROM products ORDER BY created_at DESC'
      );
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
        'SELECT * FROM products WHERE id = ?',
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
        'INSERT INTO products (name, price, stock, category, image) VALUES (?, ?, ?, ?, ?)',
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
          image
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
        'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, image = ? WHERE id = ?',
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

      const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { change_amount, note } = req.body;

      const [products] = await db.execute(
        'SELECT stock FROM products WHERE id = ?',
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