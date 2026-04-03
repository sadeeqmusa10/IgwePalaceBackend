import { Request, Response } from "express";
import { admin } from "../config/firebase";


// Initialize Firestore
const db = admin.firestore();

// 🔹 Get Current User from Firestore
const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const firebaseId = (req as any).firebaseId;
    if (!firebaseId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userDoc = await db.collection("user").doc(firebaseId).get();

    if (!userDoc.exists) {
      res.status(404).json({ message: "User not found!" });
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
    console.error("Error getting user:", error);
    res
      .status(500)
      .json({ message: "Something went wrong getting the current user!" });
    return;
  }
};


// create user in Firestore
const createCurrentUser = async (req: Request, res: Response) => {
  try {
    const firebaseId = (req as any).firebaseId;
    const { email, name } = req.body;

    if (!email || !firebaseId || !name) {
       res.status(400).json({ message: "Missing required fields!" });
       return;
    }

    const userRef = db.collection("user").doc(firebaseId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
       res.status(400).json({ message: "User already exists!" });
       return;
    }

    const newUser = {
      firebaseId,
      email,
      createdAt: new Date().toISOString(),
    };

    await userRef.set(newUser);
    console.log(newUser);
    

    res.status(201).json({
      message: "User created successfully!",
      user: newUser,
    });
    return; 
  } catch (error) {
    res.status(500).json({ message: "Error while creating user!" });
     return;
  }
};



// 🔹 Update Current User in Firestore
const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const firebaseId = (req as any).firebaseId;
    if (!firebaseId) {
       res.status(401).json({ message: "Unauthorized" });
       return;
    }

    const userRef = db.collection("user").doc(firebaseId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
       res.status(404).json({ message: "User not found!" });
       return;
    }

    const { name, addressLine1, phone, country, city } = req.body;

    if (!name && !addressLine1 && !country && !city) {
     res.status(400).json({ message: "No fields provided to update!" });
      return; 
    }

    const updateData: {
      name?: string;
      addressLine1?: string;
      phone?: string;
      country?: string;
      city?: string;
    } = {};

    if (name) updateData.name = name;
    if (addressLine1) updateData.addressLine1 = addressLine1;
     if (phone) updateData.name = phone;
    if (country) updateData.country = country;
    if (city) updateData.city = city;

    await userRef.update(updateData);

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    res.json({
      message: "User updated successfully!",
      updatedUser: updatedUserData,
    });
     return;
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
    return; 
  }
};

export default {
  getCurrentUser,
  createCurrentUser,
  updateCurrentUser,
};
