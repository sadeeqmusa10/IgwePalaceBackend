import express from "express";
import { param } from "express-validator";
import * as RestaurantController
from "../controllers/RestaurantController";

const router = express.Router();


router.get(
  "/search/:food",

  param("food")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(
      "Food parameter must be valid"
    ),

  RestaurantController.searchRestaurants
);


router.get(
  "/",
  RestaurantController.getRestaurant
);


export default router;