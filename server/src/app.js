import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import contentRoutes from "./routes/content.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import teamRoutes from "./routes/team.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectDB } from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../server/.env") });

const app = express();

const findClientDist = () => {
  const candidates = [
    path.resolve(__dirname, "../../client/dist"),
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "dist"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "index.html"))) return c;
  }
  return path.resolve(__dirname, "../../client/dist");
};

const clientDist = findClientDist();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean);
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || process.env.VERCEL) {
      callback(null, true);
    } else {
      callback(null, true); // Allow requests across environments while preserving credentials
    }
  },
  credentials: true,
});

app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(express.json({ limit: "1mb" }));
let vercelDbConnection;
app.use("/api", (req, res, next) => {
  if (!process.env.VERCEL) return next();
  if (!vercelDbConnection) {
    vercelDbConnection = connectDB().catch((error) => {
      vercelDbConnection = null;
      throw error;
    });
  }
  vercelDbConnection.then(() => next(), next);
});

const registerApiRoutes = (prefix = "") => {
  app.get(`${prefix}/health`, (req, res) => res.json({ status: "ok" }));
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/brand`, brandRoutes);
  app.use(`${prefix}/content`, contentRoutes);
  app.use(`${prefix}/reviews`, reviewRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/team`, teamRoutes);
  app.use(`${prefix}/newsletter`, newsletterRoutes);
};

registerApiRoutes("/api");
if (process.env.VERCEL) {
  registerApiRoutes("");
}

app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
});
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
