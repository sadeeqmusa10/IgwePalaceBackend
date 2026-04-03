import express from "express";
import { firebaseAuth } from "../middleware/auth";
import { validateMyUserRequest } from "../middleware/validation";
import MyUserController from "../controllers/MyUserController";

const router = express.Router();

router.get("/", firebaseAuth, MyUserController.getCurrentUser);
router.post("/", firebaseAuth, MyUserController.createCurrentUser);
router.put(
  "/",
  firebaseAuth,
  validateMyUserRequest,
  MyUserController.updateCurrentUser
);

export default router;
