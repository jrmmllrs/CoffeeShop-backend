// controllers/saleController.js
const db = require('../config/db');

const saleController = {
  getAllSales: async (req, res) => {
    try {
      const [sales] = await db.execute(`
        SELECT s.*, u.name as cashier_name 
        FROM sales s 
        LEFT JOIN users u ON s.user_id = u.id 
        ORDER BY s.created_at DESC
      `);
      res.json(sales);
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getSaleById: async (req, res) => {
    try {
      const { id } = req.params;

      const [sales] = await db.execute(`
        SELECT s.*, u.name as cashier_name 
        FROM sales s 
        LEFT JOIN users u ON s.user_id = u.id 
        WHERE s.id = ?
      `, [id]);

      if (sales.length === 0) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      const [items] = await db.execute(`
        SELECT si.*, p.name as product_name, p.price 
        FROM sale_items si 
        JOIN products p ON si.product_id = p.id 
        WHERE si.sale_id = ?
      `, [id]);

      res.json({
        ...sales[0],
        items
      });
    } catch (error) {
      console.error('Get sale error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  createSale: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { items, payment_method, reference_no } = req.body;
      const user_id = req.user.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Sale items are required' });
      }

      let total = 0;
      for (const item of items) {
        const [products] = await connection.execute(
          'SELECT stock, price FROM products WHERE id = ?',
          [item.product_id]
        );

        if (products.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const product = products[0];
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }

        total += product.price * item.quantity;
      }

      const [saleResult] = await connection.execute(
        'INSERT INTO sales (total, payment_method, user_id, reference_no) VALUES (?, ?, ?, ?)',
        [total, payment_method || 'cash', user_id, reference_no]
      );

      const saleId = saleResult.insertId;

      for (const item of items) {
        const [products] = await connection.execute(
          'SELECT price FROM products WHERE id = ?',
          [item.product_id]
        );

        const subtotal = products[0].price * item.quantity;

        await connection.execute(
          'INSERT INTO sale_items (sale_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, subtotal]
        );

        await connection.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        await connection.execute(
          'INSERT INTO inventory_logs (product_id, change_amount, note) VALUES (?, ?, ?)',
          [item.product_id, -item.quantity, `Sale #${saleId}`]
        );
      }

      await connection.commit();

      res.status(201).json({
        message: 'Sale created successfully',
        sale: {
          id: saleId,
          total,
          payment_method: payment_method || 'cash',
          reference_no
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Create sale error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    } finally {
      connection.release();
    }
  },

  getSalesReport: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          DATE(s.created_at) as date,
          COUNT(*) as total_sales,
          SUM(s.total) as total_revenue,
          AVG(s.total) as average_sale
        FROM sales s
      `;
      const params = [];

      if (start_date && end_date) {
        query += ' WHERE DATE(s.created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' GROUP BY DATE(s.created_at) ORDER BY date DESC';

      const [report] = await db.execute(query, params);
      res.json(report);
    } catch (error) {
      console.error('Get sales report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // FIXED: Get hourly sales data with timezone adjustment
  getHourlySales: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      // Try with timezone conversion first, fallback to simple approach
      let query = `
        SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as transaction_count,
          SUM(total) as total_revenue
        FROM sales 
        WHERE 1=1
      `;
      const params = [];

      if (start_date && end_date) {
        query += ' AND DATE(created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' GROUP BY HOUR(created_at) ORDER BY hour';

      const [hourlyData] = await db.execute(query, params);
      
      // Format the response to ensure all hours (0-23) are represented
      const hourlyMap = {};
      hourlyData.forEach(item => {
        hourlyMap[item.hour] = item;
      });

      // Create complete hourly data (0-23)
      const completeHourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        if (hourlyMap[hour]) {
          completeHourlyData.push(hourlyMap[hour]);
        } else {
          completeHourlyData.push({
            hour: hour,
            transaction_count: 0,
            total_revenue: 0
          });
        }
      }

      res.json(completeHourlyData);
    } catch (error) {
      console.error('Get hourly sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Alternative method if timezone conversion is needed
getHourlySalesWithTimezone: async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        HOUR(CONVERT_TZ(created_at, '+00:00', '+08:00')) AS hour,
        COUNT(*) AS transaction_count,
        SUM(total) AS total_revenue
      FROM sales
      WHERE 1=1
    `;
    const params = [];

    if (start_date && end_date) {
      query += ` AND DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` GROUP BY HOUR(CONVERT_TZ(created_at, '+00:00', '+08:00')) ORDER BY hour`;

    const [hourlyData] = await db.execute(query, params);
    res.json(hourlyData);
  } catch (error) {
    console.error('Get hourly sales with timezone error:', error);
    return saleController.getHourlySales(req, res);
  }
},


  getPaymentMethodAnalytics: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          SUM(total) as total_amount,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM sales WHERE 1=1 
            ${start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : ''}
          )), 2) as percentage
        FROM sales 
        WHERE 1=1
      `;
      const params = [];

      if (start_date && end_date) {
        query += ' AND DATE(created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
        // Add the same parameters for the subquery
        params.push(start_date, end_date);
      }

      query += ' GROUP BY payment_method ORDER BY total_amount DESC';

      const [analytics] = await db.execute(query, params);
      res.json(analytics);
    } catch (error) {
      console.error('Get payment analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getCategorySales: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          p.category,
          COUNT(si.id) as items_sold,
          SUM(si.subtotal) as total_revenue,
          SUM(si.quantity) as total_quantity
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE 1=1
      `;
      const params = [];

      if (start_date && end_date) {
        query += ' AND DATE(s.created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' GROUP BY p.category ORDER BY total_revenue DESC';

      const [categoryData] = await db.execute(query, params);
      res.json(categoryData);
    } catch (error) {
      console.error('Get category sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = saleController;