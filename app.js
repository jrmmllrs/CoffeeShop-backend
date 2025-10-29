const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Example DB test
app.get("/api/test-db", (req, res) => {
  db.query("SELECT NOW() AS currentTime", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

module.exports = app;
