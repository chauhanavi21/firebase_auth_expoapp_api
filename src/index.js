import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import { cronJob } from "./config/cron.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) => res.json({ success: true, message: "Server is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Start cron only in production
if (process.env.NODE_ENV === "production") {
  cronJob.start();
  console.log("🔄 Cron job started - server will self-ping every 14 minutes");
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend running on port ${port}`));
