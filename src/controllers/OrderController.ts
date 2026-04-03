
import { Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { db } from "../config/firebase";
import { Restaurant } from "../models/restaurant";
import { Order } from "../models/Order";
import { firestore } from "firebase-admin";
import { getDistanceMeters } from "../config/deliveryDistance";
import {
  calculateDeliveryPrice,
  estimatedDeliveryTime,
} from "../config/deliveryPrice";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

/* =====================================================
   GET MY ORDERS
===================================================== */

const getMyOrders = async (req: Request, res: Response) => {
  try {
    const firebaseId = req.firebaseId;

    if (!firebaseId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const snapshot = await db
      .collection("orders")
      .where("userId", "==", firebaseId)
      .get();

    const orders: Order[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        cartItems: data.cartItems.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity),
        })),
      } as Order;
    });

    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


/* =====================================================
   CREATE CHECKOUT SESSION
===================================================== */

const createCheckoutSession = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const firebaseId = req.firebaseId;

    if (!firebaseId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { cartItems, deliveryDetails, restaurantId } = req.body;

    if (!restaurantId || !cartItems?.length || !deliveryDetails) {
      return res.status(400).json({ message: "Invalid checkout data" });
    }

    /* =========================
       FETCH RESTAURANT
    ========================= */

    const restaurantSnap = await db
      .collection("restaurant")
      .doc(restaurantId)
      .get();

    if (!restaurantSnap.exists) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const restaurant = restaurantSnap.data() as Restaurant;
/* =========================
   DISTANCE (DELIVERY ONLY)
========================= */

let distanceMeters: number | null = null;

if (deliveryDetails.orderType === "delivery") {
  if (
    deliveryDetails.addressLine1?.lat == null ||
    deliveryDetails.addressLine1?.lng == null
  ) {
    return res.status(400).json({
      message: "Delivery address coordinates missing",
    });
  }

  if (
    restaurant.address?.lat == null ||
    restaurant.address?.lng == null
  ) {
    return res.status(500).json({
      message: "Restaurant location not configured",
    });
  }

  distanceMeters = await getDistanceMeters(
    deliveryDetails.addressLine1,
    restaurant.address
  );
}

/* =========================
   DELIVERY PRICE & TIME
========================= */

const deliveryPrice =
  deliveryDetails.orderType === "delivery" && distanceMeters !== null
    ? calculateDeliveryPrice(
        distanceMeters,
        deliveryDetails.deliveryType ?? "standard"
      )
    : 0;

const deliveryTimeMinutes =
  deliveryDetails.orderType === "delivery" && distanceMeters !== null
    ? estimatedDeliveryTime(
        distanceMeters,
        deliveryDetails.deliveryType ?? "standard"
      )
    : 0;


    /* =========================
       ITEMS TOTAL
    ========================= */

    const itemsTotal = cartItems.reduce((sum: number, item: any) => {
      const menuItem = restaurant.menuItem.find(
        (m) => m.id === item.id
      );

      return menuItem
        ? sum + menuItem.price * Number(item.quantity)
        : sum;
    }, 0);

    const totalAmount = itemsTotal + deliveryPrice;

    /* =========================
       GET USER EMAIL
    ========================= */

    const userSnap = await db.collection("users").doc(firebaseId).get();

    const userEmail =
      userSnap.exists && userSnap.data()?.email
        ? userSnap.data()!.email
        : "customer@godiyaoni.com";

    /* =========================
       CREATE ORDER
    ========================= */

    const orderRef = db.collection("orders").doc();

    const newOrder: Order = {
      id: orderRef.id,
      userId: firebaseId,
      restaurantId,
   restaurantSnapshot: {
    name: restaurant.restaurantName,
    imageUrl: restaurant.imageUrl,
    addressText: restaurant.address.text,
    lat: restaurant.address.lat,
    lng: restaurant.address.lng,
  },

      cartItems: cartItems.map((i: any) => {
  const menuItem = restaurant.menuItem.find(
    (m) => m.id === i.id
  );

  return {
    id: i.id,
    name: menuItem?.name ?? "Unknown item",
    price: menuItem?.price ?? 0,
    quantity: Number(i.quantity),
    imageUrl: menuItem?.imageUrl,
  };
}),

      deliveryDetails,
      deliveryType: deliveryDetails.deliveryType ?? null,
      orderType: deliveryDetails.orderType,
      deliveryPrice,
      deliveryTimeMinutes,

      status: "placed",
      totalAmount,

      createdAt: firestore.Timestamp.now(),
    };

    await orderRef.set(newOrder);

    /* =========================
       PAYSTACK INITIALIZATION
    ========================= */

    const callbackUrl = `godiyaoni://CurrentOrderStatusScreen/${orderRef.id}`;

    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: userEmail,
        amount: Math.round(totalAmount * 100),
        callback_url: callbackUrl,
        metadata: {
          orderId: orderRef.id,
          restaurantId,
          userId: firebaseId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return res.status(200).json({
      url: paystackRes.data.data.authorization_url,
    });
  } catch (error: any) {
    console.error("Checkout error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Checkout failed" });
  }
};

/* =====================================================
   PAYSTACK WEBHOOK
===================================================== */

const paystackOrderWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(req.body as Buffer)
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse((req.body as Buffer).toString("utf8"));

    if (event.event === "charge.success") {
      const orderId = event.data?.metadata?.orderId;

      if (orderId) {
        await db.collection("orders").doc(orderId).update({
          status: "paid",
          paymentReference: event.data.reference,
          updatedAt: firestore.Timestamp.now(),
        });
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
};

export default {
  getMyOrders,
  createCheckoutSession,
  paystackOrderWebhookHandler,
};
