require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const cronRoutes = require("./routes/cron");

const FRONTEND_URL = process.env.APP_URL || "http://localhost:5173";

const app = express();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api/cron", cronRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

module.exports = app;
