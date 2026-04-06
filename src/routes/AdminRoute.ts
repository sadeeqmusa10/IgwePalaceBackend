import express from "express";
import multer from "multer";
import AdminController from "../controllers/AdminController";
import { firebaseAuth } from "../middleware/auth";

const router = express.Router();

/**
 * ===============================
 * MULTER CONFIG
 * ===============================
 */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB per image
  },
});

/**
 * Accept:
 *
 * imageFile
 * menuImage_0
 * menuImage_1
 * menuImage_2
 * ...
 */

const uploadFields = upload.any();

/**
 * ===============================
 * ROUTES
 * ===============================
 */

router.post(
  "/restaurant",
  firebaseAuth,
  uploadFields,
  AdminController.createAdminRestaurant
);

router.put(
  "/restaurant/:restaurantId",
  firebaseAuth,
  uploadFields,
  AdminController.updateAdminRestaurant
);

router.get(
  "/restaurant",
  firebaseAuth,
  AdminController.getAdminRestaurant
);

router.get(
  "/orders",
  firebaseAuth,
  AdminController.getAllAdminOrders
);

router.patch(
  "/orders/:orderId/status",
  firebaseAuth,
  AdminController.updateAdminOrderStatus
);

export default router;