import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

const handleValidationErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateLoginRequest = [
  body("email").isString().notEmpty().withMessage("Email"),
  body("password").isString().notEmpty().withMessage("password"),
];

export const validateMyUserRequest = [
  body("name").isString().notEmpty().withMessage("enter your name"),
  body("addressLine1").isString().notEmpty().withMessage("enter your address"),
  body("city").isString().notEmpty().withMessage("enter your city"),
  body("country").isString().notEmpty().withMessage("enter your country"),
  handleValidationErrors,
];

export const validateMyRestaurantrequest = [
  body("restaurantName")
    .notEmpty()
    .withMessage("Restaurant name is required"),

  body("city")
    .notEmpty()
    .withMessage("City name is required"),

  body("country")
    .notEmpty()
    .withMessage("Country is required"),

  body("deliveryPrice")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Delivery price must be positive"),

  body("estimatedDeliveryTime")
    .toInt()
    .isInt({ min: 1 })
    .withMessage("Estimated delivery time must be >= 1"),

  /**
   * ADDRESS VALIDATION
   */
  body("restaurantAddress").custom((value) => {
    try {
      const parsed =
        typeof value === "string"
          ? JSON.parse(value)
          : value;

      if (!parsed.text) {
        throw new Error("Address text required");
      }

      if (parsed.lat === undefined || parsed.lng === undefined) {
        throw new Error("Address coordinates required");
      }

      return true;
    } catch {
      throw new Error("Invalid restaurant address");
    }
  }),

  /**
   * MENU ITEMS VALIDATION
   */
  body("menuItem").custom((value) => {
    try {
      const parsed =
        typeof value === "string"
          ? JSON.parse(value)
          : value;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Menu must contain at least 1 item");
      }

      parsed.forEach((item: any, index: number) => {
        if (!item.name) {
          throw new Error(
            `Menu item ${index + 1}: name required`
          );
        }

        if (!item.description) {
          throw new Error(
            `Menu item ${index + 1}: description required`
          );
        }

        if (!item.category) {
          throw new Error(
            `Menu item ${index + 1}: category required`
          );
        }

        if (!item.price) {
          throw new Error(
            `Menu item ${index + 1}: price required`
          );
        }
      });

      return true;
    } catch (err: any) {
      throw new Error(
        err.message || "Invalid menu items structure"
      );
    }
  }),

  /**
   * RESTAURANT IMAGE VALIDATION
   * Required only on CREATE
   * Optional on UPDATE
   */
  body().custom((_, { req }) => {
    const hasExistingImage =
      req.body.imageUrl && req.body.imageUrl !== "";
      
const hasUploadedImage =
  Array.isArray(req.files) &&
  req.files.some(
    (file: Express.Multer.File) =>
      file.fieldname === "imageFile"
  );

    if (!hasExistingImage && !hasUploadedImage) {
      throw new Error(
        "Restaurant image is required"
      );
    }

    return true;
  }),

  handleValidationErrors,
];