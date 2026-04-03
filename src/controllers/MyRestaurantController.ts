import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { admin } from "../config/firebase";
import crypto from "crypto";
import { firestore } from "firebase-admin";
import { Restaurant } from "../models/restaurant";
import { getDistanceMeters } from "../config/deliveryDistance";
import { calculateDeliveryPrice } from "../config/deliveryPrice";

const db = admin.firestore();

/* ============================
   GET MY RESTAURANT
============================ */
const getMyRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await db
      .collection("restaurant")
      .doc((req as any).firebaseId)
      .get();

    if (!doc.exists) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch restaurant" });
  }
};

/* ============================
   CREATE MY RESTAURANT
============================ */
const createMyRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      restaurantName,
      city,
      country,
      menuItem,
      userAddress,
      address,
    } = req.body;

    if (!userAddress || !address) {
      res.status(400).json({ message: "Addresses required" });
      return;
    }

    // ✅ FIX: safely parse menuItem
    let parsedMenuItems: any[] = [];
    if (menuItem) {
      parsedMenuItems =
        typeof menuItem === "string" ? JSON.parse(menuItem) : menuItem;
    }

    const distanceMeters = await getDistanceMeters(userAddress, address);

    const deliveryPrice = calculateDeliveryPrice(distanceMeters, "standard");
    const deliveryTimeMinutes = Math.ceil(distanceMeters / 1000) * 5;

    let imageUrl = "";
    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }

    const restaurantRef = db
      .collection("restaurant")
      .doc((req as any).firebaseId);

    const newRestaurant: Restaurant = {
      restaurantId: (req as any).firebaseId,
      firebaseId: (req as any).firebaseId,
      userId: (req as any).firebaseId,

      restaurantName,
      restaurantNameLower: restaurantName.toLowerCase(),

      address,

      city,
      cityLower: city.toLowerCase(),
      country,

      deliveryTimeMinutes,
      deliveryPrice,

      // ✅ FIX: use parsedMenuItems OUTSIDE object
      menuItem: parsedMenuItems.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        name: item.name,
        nameLower: item.name.toLowerCase(),
        description: item.description || "",
        category: item.category || "",
        stars: item.stars ? Number(item.stars) : 0,
        review: item.review ? Number(item.review) : 0,
        price: Number(item.price),
        imageUrl: item.imageUrl || "",
      })),

      imageUrl,
      lastUpdated: firestore.Timestamp.now(),
    };

    await restaurantRef.set(newRestaurant);

    res.status(201).json(newRestaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create restaurant" });
  }
};

/* ============================
   UPDATE MY RESTAURANT
============================ */
const updateMyRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ref = db
      .collection("restaurant")
      .doc((req as any).firebaseId);

    const doc = await ref.get();

    if (!doc.exists) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    const existing = doc.data() as Restaurant;

    const { menuItem } = req.body;

    // ✅ FIX: parse menuItem safely
    let parsedMenuItems: any[] | undefined = undefined;
    if (menuItem) {
      parsedMenuItems =
        typeof menuItem === "string" ? JSON.parse(menuItem) : menuItem;
    }

    const updated: Partial<Restaurant> = {
      restaurantName: req.body.restaurantName ?? existing.restaurantName,
      restaurantNameLower: req.body.restaurantName
        ? req.body.restaurantName.toLowerCase()
        : existing.restaurantNameLower,

      city: req.body.city ?? existing.city,
      cityLower: req.body.city
        ? req.body.city.toLowerCase()
        : existing.cityLower,

      country: req.body.country ?? existing.country,

      // ✅ FIX: use parsedMenuItems
      menuItem: parsedMenuItems
        ? parsedMenuItems.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name,
            nameLower: item.name.toLowerCase(),
            description: item.description || "",
            category: item.category || "",
            stars: item.stars ? Number(item.stars) : 0,
            review: item.review ? Number(item.review) : 0,
            price: Number(item.price),
            imageUrl: item.imageUrl || "",
          }))
        : existing.menuItem,

      lastUpdated: firestore.Timestamp.now(),
    };

    if (req.file) {
      updated.imageUrl = await uploadImage(req.file);
    }

    await ref.set({ ...existing, ...updated }, { merge: true });

    res.json({ ...existing, ...updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update restaurant" });
  }
};

/* ============================
   IMAGE UPLOAD
============================ */
const uploadImage = async (file: Express.Multer.File) => {
  const base64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataURI);
  return result.secure_url;
};

export default {
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
};