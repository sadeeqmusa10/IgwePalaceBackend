import { firestore } from "firebase-admin";

/* =====================
   ORDER STATUS
===================== */

export type OrderStatus =
  | "placed"
  | "paid"
  | "inProgress"
  | "outForDelivery"
  | "delivered";

/* =====================
   COORDINATES
===================== */

export type Coordinates = {
  text: string;
  lat: number;
  lng: number;
};

/* =====================
   CART ITEM
===================== */

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price?: number; // optional safety
  imageurl?: string;
}

/* =====================
   DELIVERY DETAILS
   (NO EMAIL HERE ❌)
===================== */

export interface DeliveryDetails {
  name: string;
  phone: string;

  orderType: "delivery" | "takeaway" | "dining";

  // Only required for delivery
  addressLine1?: Coordinates;
  city?: string;
  country?: string;
}

/* =====================
   ORDER
===================== */

export interface RestaurantSnapshot {
  name: string;
  imageUrl?: string;
  addressText?: string;
  lat: number;
  lng: number;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;

  restaurantSnapshot: RestaurantSnapshot;

  cartItems: CartItem[];
  deliveryDetails: DeliveryDetails;

  orderType: "delivery" | "takeaway" | "dining";
  deliveryType?: "express" | "same-day" | "standard";

  distanceMeters?: number;
  deliveryPrice: number;
  deliveryTimeMinutes: number;

  totalAmount: number;
  status: OrderStatus;
  paymentReference?: string;

  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
}
