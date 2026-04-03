import express from "express";
import { param } from "express-validator";
import * as RestaurantController from "../controllers/RestaurantController";

const router = express.Router();

router.get(
  "/search/:city",
  param("city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("city parameter must be a valid string!"),
  RestaurantController.searchRestaurants
);


router.get("/", RestaurantController.getRestaurant)


export default router;
