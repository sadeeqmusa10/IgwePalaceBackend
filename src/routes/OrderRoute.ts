import express from "express";
import { firebaseAuth } from "../middleware/auth";
import OrderController from "../controllers/OrderController";

const router = express.Router();

router.get("/", firebaseAuth, OrderController.getMyOrders);

router.post(
  "/checkout/create-checkout-session",
  firebaseAuth,
  OrderController.createCheckoutSession
);

router.post(
  "/paystack/webhook",
  express.raw({ type: "application/json" }),
  OrderController.paystackOrderWebhookHandler
);
export default router;