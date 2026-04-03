import express from "express";
import multer from "multer";
import MyRestaurantController from "../controllers/MyRestaurantController";
import { firebaseAuth } from "../middleware/auth";
import { validateMyRestaurantrequest } from "../middleware/validation";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/", firebaseAuth, MyRestaurantController.getMyRestaurant);

router.post(
  "/",
  firebaseAuth,
  upload.single("imageFile"),
  validateMyRestaurantrequest,
  MyRestaurantController.createMyRestaurant
);

router.put(
  "/",
  firebaseAuth,
  upload.single("imageFile"),
  validateMyRestaurantrequest,
  MyRestaurantController.updateMyRestaurant
);
export default router;
