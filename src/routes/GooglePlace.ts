// routes/googlePlaces.ts
import { Router } from "express";
import axios from "axios";

const router = Router();

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY!;

/* ================= AUTOCOMPLETE ================= */
router.get("/autocomplete", async (req, res) => {
  try {
    const { input } = req.query;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      {
        params: {
          input,
          key: GOOGLE_KEY,
          components: "country:ng",
        },
      }
    );

    res.json(response.data);
  } catch (err: any) {
    console.error("Google autocomplete error:", err.message);
    res.status(500).json({ message: "Autocomplete failed" });
  }
});

/* ================= PLACE DETAILS ================= */
router.get("/details", async (req, res) => {
  try {
    const { placeId } = req.query;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: placeId,
          key: GOOGLE_KEY,
        },
      }
    );

    res.json(response.data);
  } catch (err: any) {
    console.error("Google details error:", err.message);
    res.status(500).json({ message: "Details failed" });
  }
});

export default router;
