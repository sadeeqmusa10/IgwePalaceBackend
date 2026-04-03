export interface User {
  id: string; // Firestore document ID
  name: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  role: "user" | "admin" | "restaurant";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
