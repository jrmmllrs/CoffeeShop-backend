const express = require("express");
const cors = require("cors");
const db = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const saleRoutes = require("./routes/sales");
const inventoryRoutes = require("./routes/inventory");

const app = express();

// SIMPLIFIED CORS - This will fix the issue
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://coffee-shop-frontend.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Database test
app.get("/test-db", async (req, res) => {
  try {
    const [results] = await db.execute("SELECT NOW() AS currentTime");
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/inventory", inventoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;
