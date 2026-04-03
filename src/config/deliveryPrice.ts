export type DeliveryType = "standard" | "express" | "same-day";

/**
 * BUSINESS RULES (Nigeria-optimized)
 * - City delivery focus
 * - Hard caps prevent insane prices
 */

const MAX_DISTANCE_METERS = 100_000; // 100km
const MAX_DELIVERY_PRICE = 8_000;    // ₦8,000
const MAX_DELIVERY_TIME = 180;       // 3 hours

export function calculateDeliveryPrice(
  distanceMeters: number,
  deliveryType: DeliveryType
): number {
  // 🔐 SAFETY CLAMP
  const safeDistance = Math.min(distanceMeters, MAX_DISTANCE_METERS);
  const km = Math.ceil(safeDistance / 1000);

  const base =
    deliveryType === "express"
      ? 2000
      : deliveryType === "same-day"
      ? 3000
      : 1000;

  const perKm =
    deliveryType === "express"
      ? 80
      : deliveryType === "same-day"
      ? 100
      : 50;

  const price = base + km * perKm;

  return Math.min(price, MAX_DELIVERY_PRICE);
}

export function estimatedDeliveryTime(
  distanceMeters: number,
  deliveryType: DeliveryType
): number {
  const safeDistance = Math.min(distanceMeters, MAX_DISTANCE_METERS);
  const km = safeDistance / 1000;

  const speed =
    deliveryType === "express"
      ? 60
      : deliveryType === "same-day"
      ? 50
      : 35;

  const minutes = (km / speed) * 60;

  return Math.min(Math.ceil(minutes), MAX_DELIVERY_TIME);
}
