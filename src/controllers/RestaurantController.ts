import { Request, Response } from "express";
import { firestore } from "firebase-admin";
import { Restaurant } from "../models/restaurant";

const db = firestore();

export const getRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const snapshot = await db
      .collection("restaurant")
      .limit(1)
      .get();

    if (snapshot.empty) {
      res.status(404).json({
        message: "Restaurant not found",
      });
      return;
    }

    const doc = snapshot.docs[0];

    res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });

    return;
  } catch (error) {
    console.error("Get restaurant failed:", error);

    res.status(500).json({
      message: "Something went wrong",
    });

    return;
  }
};

export const searchRestaurants = async (req: Request, res: Response) => {
  try {
    const city = (req.params.city || "");
    const searchQuery = ((req.query.searchQuery as string) || "")
      .trim()
      .toLowerCase();
    const selectedCuisines = ((req.query.selectedCuisines as string) || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const sortOption = (req.query.sortOption as string) || "lastUpdated";
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    if (!city) {
      res.status(400).json({ message: "City parameter is required" });
       return;
    }

    // Allowed sort options
    const allowedSortOptions = ["lastUpdated", "restaurantName", "rating"];
    const sortField = allowedSortOptions.includes(sortOption)
      ? sortOption
      : "lastUpdated";

    let query: firestore.Query<firestore.DocumentData> = db
      .collection("restaurant")
      .where("cityLower", "==", city); // <-- use cityLower field for case-insensitive search

    // Filter by cuisines
    if (selectedCuisines.length > 0) {
      query = query.where("cuisines", "array-contains-any", selectedCuisines);
    }

    // Filter by restaurant name
    if (searchQuery) {
      query = query
        .where("restaurantNameLower", ">=", searchQuery)
        .where("restaurantNameLower", "<=", searchQuery + "\uf8ff");
    }

    // Sorting
    query = query.orderBy(sortField, "asc");

    // Count total results
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Pagination
    const offset = (page - 1) * pageSize;
    const restaurantDocs = await query.offset(offset).limit(pageSize).get();

    const restaurants: Restaurant[] = restaurantDocs.docs.map((doc) => ({
      ...(doc.data() as Restaurant),
      id: doc.id,
    }));

    res.json({
      data: restaurants,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Search restaurants failed:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

