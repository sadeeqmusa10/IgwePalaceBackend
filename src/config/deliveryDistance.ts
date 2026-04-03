import axios from "axios";

export async function getDistanceMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  const res = await axios.post(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
    {
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
        },
      ],
      destinations: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
        },
      ],
      travelMode: "DRIVE",
    },
    {
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "distanceMeters",
      },
    }
  );

  const distance = res.data?.[0]?.distanceMeters;

  if (typeof distance !== "number" || distance <= 0) {
    throw new Error("Invalid distance returned from Google");
  }

  return distance;
}
