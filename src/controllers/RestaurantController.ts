import { Request, Response } from "express";
import { firestore } from "firebase-admin";
import { Restaurant } from "../models/restaurant";

const db = firestore();

/*
==============================
GET SINGLE RESTAURANT
==============================
*/
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

  } catch (error) {
    console.error("Get restaurant failed:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


/*
==============================
SEARCH RESTAURANTS BY FOOD
==============================
*/
export const searchRestaurants = async (
  req: Request,
  res: Response
) => {
  try {

    const foodParam = req.params.food;

    const food =
      typeof foodParam === "string"
        ? foodParam.trim().toLowerCase()
        : "";

    const searchQueryParam = req.query.searchQuery;

    const searchQuery =
      typeof searchQueryParam === "string"
        ? searchQueryParam.trim().toLowerCase()
        : "";

    const pageParam = req.query.page;

    const page =
      typeof pageParam === "string"
        ? parseInt(pageParam)
        : 1;

    const pageSize = 10;

    if (!food) {
      res.status(400).json({
        message: "Food parameter required",
      });
      return;
    }

    let query: firestore.Query =
      db.collection("restaurant")
        .where(
          "menuItemNamesLower",
          "array-contains",
          food
        );

    if (searchQuery) {
      query = query
        .where(
          "restaurantNameLower",
          ">=",
          searchQuery
        )
        .where(
          "restaurantNameLower",
          "<=",
          searchQuery + "\uf8ff"
        );
    }

    const countSnap =
      await query.count().get();

    const total =
      countSnap.data().count;

    const offset =
      (page - 1) * pageSize;

    const restaurantDocs =
      await query
        .offset(offset)
        .limit(pageSize)
        .get();

    const restaurants: Restaurant[] =
      restaurantDocs.docs.map((doc) => ({
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

    console.error(
      "Search restaurants failed:",
      error
    );

    res.status(500).json({
      message: "Something went wrong!",
    });

  }
};