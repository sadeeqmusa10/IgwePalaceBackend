import * as functions from "firebase-functions";
import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { admin } from "./config/firebase";

import MyUserRoute from "./routes/MyUserRoute";
import MyRestaurantRoute from "./routes/MyRestaurantRoute";
import OrderRoutes from "./routes/OrderRoute";
import RestaurantRoutes from "./routes/RestaurantRoutes";
import AdminRoute from "./routes/AdminRoute";

import { v2 as cloudinary } from "cloudinary";

// ===============================
// CLOUDINARY CONFIG
// ===============================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===============================
// EXPRESS APP
// ===============================

const app = express();

// ✅ IMPORTANT ORDER
// CORS must come BEFORE routes
app.use(cors());

// ✅ JSON parser AFTER multer-compatible routes
// This prevents multipart FormData breaking
app.use(express.json({ limit: "10mb" }));

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", async (_req: Request, res: Response) => {
  res.send({ message: "Health check passed!" });
});

// ===============================
// ROUTES
// ===============================

// ADMIN ROUTES (contains multer upload.any())
app.use("/api/my/admin", AdminRoute);

// USER ROUTES
app.use("/api/my/user", MyUserRoute);

// RESTAURANT OWNER ROUTES
app.use("/api/my/restaurant", MyRestaurantRoute);

// PUBLIC RESTAURANTS
app.use("/api/restaurant", RestaurantRoutes);

// ORDERS
app.use("/api/order", OrderRoutes);

// ===============================
// FIRESTORE TEST
// ===============================

const db = admin.firestore();

app.get("/test-firestore", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("test").get();

    const docs = snapshot.docs.map((doc) => doc.data());

    res.json({
      success: true,
      data: docs,
    });
  } catch (error) {
    console.error("Firestore Error:", error);

    res.status(500).json({
      success: false,
    });
  }
});

// ===============================
// RENDER SERVER START
// ===============================

const PORT = Number(process.env.PORT) || 7000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 Server started on port ${PORT}`);
});

// ===============================
// FIREBASE FUNCTION EXPORT
// ===============================

export const api = functions.https.onRequest(app);