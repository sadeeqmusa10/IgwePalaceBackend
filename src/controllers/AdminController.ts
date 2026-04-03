import { db } from "../config/firebase";
import { Request, Response } from "express";
import { Restaurant } from "../models/restaurant";
import { firestore } from "firebase-admin";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

/**
 * ===============================
 * ROLE AUTHORIZATION
 * ===============================
 * Only admins or restaurant managers are allowed
 */
const assertAdminOrManager = async (firebaseId: string) => {
  const adminRef = db.collection("admin").doc(firebaseId);
  const adminSnap = await adminRef.get();

  if (!adminSnap.exists) {
    throw new Error("UNAUTHORIZED");
  }

  const role = adminSnap.data()?.role;
  if (role !== "admin" && role !== "restaurant_manager") {
    throw new Error("FORBIDDEN");
  }
};

const getAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const firebaseId = (req as any).firebaseId;
    if (!firebaseId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userDoc = await db.collection("admin").doc(firebaseId).get();

    if (!userDoc.exists) {
      res.status(404).json({ message: "Admin not found!" });
      return;
    }

    const userData = userDoc.data();

    if (userData?.isDisabled || userData?.isBlocked) {
      res
        .status(403)
        .json({ message: "Your account is disabled or blocked." });
    }
    res.json(userData);
    return;
    
  } catch (error) {
    console.error("Error getting admin:", error);
    res
      .status(500)
      .json({ message: "Something went wrong getting the current admin!" });
    return;
  }
};

/**
 * ===============================
 * GET ADMIN RESTAURANT (OWNED)
 * ===============================
 */
const getAdminRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantDoc = await db
      .collection("restaurant")
      .doc(req.firebaseId)
      .get();

    if (!restaurantDoc.exists) {
      return res.status(404).json({ message: "Restaurant not found!" });
    }

    const restaurantData = restaurantDoc.data() as Restaurant;
    return res.json(restaurantData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching the restaurant!" });
  }
};

/**
 * ===============================
 * CREATE RESTAURANT (ADMIN / MANAGER)
 * ===============================
 */
const createAdminRestaurant = async (req: Request, res: Response) => {
  try {
    await assertAdminOrManager(req.firebaseId);

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    let {
      restaurantName,
      city,
      country,
      restaurantAddress,
      deliveryPrice,
      estimatedDeliveryTime,
      menuItem,
    } = req.body;

    const parsedAddress =
      typeof restaurantAddress === "string"
        ? JSON.parse(restaurantAddress)
        : restaurantAddress;

    const parsedMenuItems =
      typeof menuItem === "string"
        ? JSON.parse(menuItem)
        : menuItem;

    const files = req.files as Express.Multer.File[];

    let imageUrl = "";

    const menuImageMap: Record<number, string> = {};

    if (files?.length) {
      for (const file of files) {
        console.log("Uploading:", file.fieldname);

        if (file.fieldname === "imageFile") {
          imageUrl = await uploadImage(file);
        }

        if (file.fieldname.startsWith("menuImage_")) {
          const index = Number(file.fieldname.split("_")[1]);

          menuImageMap[index] = await uploadImage(file);
        }
      }
    }

    const restaurantRef = db.collection("restaurant").doc(req.firebaseId);

    const newRestaurant: Restaurant = {
      restaurantId: restaurantRef.id,
      firebaseId: req.firebaseId,
      userId: req.firebaseId,

      restaurantName,
      restaurantNameLower: restaurantName.toLowerCase(),

      address: {
        text: parsedAddress.text,
        lat: Number(parsedAddress.lat),
        lng: Number(parsedAddress.lng),
      },

      city,
      cityLower: city.toLowerCase(),
      country,

      deliveryTimeMinutes: Number(estimatedDeliveryTime),
      deliveryPrice: Number(deliveryPrice),

      menuItem: parsedMenuItems.map(
        (item: any, index: number) => ({
          id: item.id ?? crypto.randomUUID(),

          name: item.name,
          nameLower: item.name.toLowerCase(),

          description: item.description ?? "",
          category: item.category ?? "",

          price: Number(item.price),

          stars: item.stars ?? 0,
          review: item.review ?? 0,

          imageUrl:
            menuImageMap[index] ||
            item.imageUrl ||
            "",
        })
      ),

      imageUrl,

      lastUpdated: firestore.Timestamp.now(),
    };

    await restaurantRef.set(newRestaurant);

    return res.status(201).json(newRestaurant);
  } catch (error) {
    console.error("CREATE ERROR:", error);

    return res.status(500).json({
      message: "Something went wrong creating your restaurant!",
    });
  }
};

/**
 * ===============================
 * UPDATE RESTAURANT (ADMIN / MANAGER)
 * ===============================
 */
const updateAdminRestaurant = async (req: Request, res: Response) => {
  try {
    await assertAdminOrManager(req.firebaseId);

    const restaurantIdParam = req.params.restaurantId;

const restaurantId = Array.isArray(restaurantIdParam)
  ? restaurantIdParam[0]
  : restaurantIdParam;

if (!restaurantId) {
  return res.status(400).json({
    message: "Invalid restaurant ID",
  });
}

    const restaurantDoc = await db
      .collection("restaurant")
      .doc(restaurantId)
      .get();

    if (!restaurantDoc.exists) {
      return res.status(404).json({
        message: "Restaurant not found!",
      });
    }

    const existingRestaurant =
      restaurantDoc.data() as Restaurant;

    const parsedAddress = req.body.restaurantAddress
      ? typeof req.body.restaurantAddress === "string"
        ? JSON.parse(req.body.restaurantAddress)
        : req.body.restaurantAddress
      : existingRestaurant.address;

    let parsedMenuItems =
      existingRestaurant.menuItem;

    if (req.body.menuItem) {
      parsedMenuItems =
        typeof req.body.menuItem === "string"
          ? JSON.parse(req.body.menuItem)
          : req.body.menuItem;
    }

    const files = req.files as Express.Multer.File[];

    const menuImageMap: Record<number, string> = {};

    let updatedRestaurantImage =
      existingRestaurant.imageUrl;

    if (files?.length) {
      for (const file of files) {

        if (file.fieldname === "imageFile") {
          updatedRestaurantImage =
            await uploadImage(file);
        }

        if (file.fieldname.startsWith("menuImage_")) {
          const index = Number(
            file.fieldname.split("_")[1]
          );

          menuImageMap[index] =
            await uploadImage(file);
        }
      }
    }

    const updatedRestaurant: Restaurant = {
      ...existingRestaurant,

      restaurantName:
        req.body.restaurantName ??
        existingRestaurant.restaurantName,

      restaurantNameLower:
        req.body.restaurantName
          ? req.body.restaurantName.toLowerCase()
          : existingRestaurant.restaurantNameLower,

      address: {
        text: parsedAddress.text,
        lat: Number(parsedAddress.lat),
        lng: Number(parsedAddress.lng),
      },

      city:
        req.body.city ?? existingRestaurant.city,

      cityLower:
        req.body.city
          ? req.body.city.toLowerCase()
          : existingRestaurant.cityLower,

      country:
        req.body.country ??
        existingRestaurant.country,

      deliveryPrice:
        req.body.deliveryPrice !== undefined
          ? Number(req.body.deliveryPrice)
          : existingRestaurant.deliveryPrice,

      deliveryTimeMinutes:
        req.body.estimatedDeliveryTime !==
        undefined
          ? Number(req.body.estimatedDeliveryTime)
          : existingRestaurant.deliveryTimeMinutes,

      menuItem: (parsedMenuItems || []).map(
        (item: any, index: number) => ({
          id: item.id || crypto.randomUUID(),

          name: item.name,
          nameLower: item.name.toLowerCase(),

          description: item.description || "",
          category: item.category || "",

          price: Number(item.price),

          stars: item.stars
            ? Number(item.stars)
            : 0,

          review: item.review
            ? Number(item.review)
            : 0,

          imageUrl:
            menuImageMap[index] ||
            item.imageUrl ||
            "",
        })
      ),

      imageUrl: updatedRestaurantImage,

      lastUpdated:
        firestore.Timestamp.fromDate(
          new Date()
        ),
    };

    await db
      .collection("restaurant")
      .doc(restaurantId)
      .set(updatedRestaurant, { merge: true });

    return res.status(200).json(updatedRestaurant);
  } catch (error: any) {
    console.error("UPDATE ERROR:", error);

    return res.status(500).json({
      message:
        "Something went wrong updating the restaurant!",
    });
  }
};
/**
 * ===============================
 * UPDATE ORDER STATUS
 * ===============================
 */
const updateAdminOrderStatus = async (req: Request, res: Response) => {
  try {
   const orderIdParam = req.params.orderId;

const orderId =
  Array.isArray(orderIdParam)
    ? orderIdParam[0]
    : orderIdParam;

if (!orderId) {
  return res.status(400).json({ message: "Invalid order ID" });
}
    const { status } = req.body;

    const allowedStatuses = [
      "placed",
      "paid",
      "inProgress",
      "outForDelivery",
      "delivered",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: "Order not found" });
    }

    await orderRef.update({
      status,
      updatedAt: firestore.Timestamp.now(),
    });

    return res.json({ message: "Order status updated successfully!" });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
};

/**
 * ===============================
 * GET RESTAURANTS WITH ORDERS
 * ===============================
 */

const getAllAdminOrders = async (req: Request, res: Response) => {
  try {
    // Use Query type, not CollectionReference
    let ordersQuery: firestore.Query<firestore.DocumentData> = db.collection("orders");

    if (req.query.restaurantId) {
      ordersQuery = ordersQuery.where(
        "restaurantId",
        "==",
        req.query.restaurantId as string
      );
    }

    const ordersSnapshot = await ordersQuery.get();
    const orders = ordersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};

/**
 * ===============================
 * IMAGE UPLOAD
 * ===============================
 */
const uploadImage = async (file: Express.Multer.File) => {
  const base64Image = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.uploader.upload(dataURI);
  return uploadResponse.url;
};

export default {
  getAdminRestaurant,
  createAdminRestaurant,
  updateAdminRestaurant,
  updateAdminOrderStatus,
  getAllAdminOrders,
  getAdmin
};
