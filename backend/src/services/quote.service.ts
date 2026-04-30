import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";

// ─── Haversine distance ──────────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

const BASE_FARE = 3500; // cents
const PER_KM_RATE = 180; // cents

const SIZE_SURCHARGES: Record<string, number> = {
  SMALL: 0,
  MEDIUM: 1000,
  LARGE: 2500,
};

const JHB_BOUNDS = {
  minLat: -26.5,
  maxLat: -25.95,
  minLng: 27.85,
  maxLng: 28.25,
};
const JHB_FLAT_RATE_CENTS = 7000;

export function isInJohannesburg(lat: number, lng: number): boolean {
  return (
    lat >= JHB_BOUNDS.minLat &&
    lat <= JHB_BOUNDS.maxLat &&
    lng >= JHB_BOUNDS.minLng &&
    lng <= JHB_BOUNDS.maxLng
  );
}

export function calculateQuote(
  pickupLat: number,
  pickupLng: number,
  deliveryLat: number,
  deliveryLng: number,
  parcelSize: string,
) {
  const distanceKm = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);

  if (
    parcelSize === "SMALL" &&
    isInJohannesburg(pickupLat, pickupLng) &&
    isInJohannesburg(deliveryLat, deliveryLng)
  ) {
    return {
      amount: JHB_FLAT_RATE_CENTS,
      distanceKm,
      breakdown: { flatRate: JHB_FLAT_RATE_CENTS },
    };
  }

  const baseFare = BASE_FARE;
  const distanceFare = Math.round(distanceKm * PER_KM_RATE);
  const sizeSurcharge = SIZE_SURCHARGES[parcelSize] ?? 0;
  const amount = baseFare + distanceFare + sizeSurcharge;

  return { amount, distanceKm, breakdown: { baseFare, distanceFare, sizeSurcharge } };
}

// ─── Quote token (JWT) ──────────────────────────────────────────────────────

interface QuoteTokenPayload {
  pickupAddress: unknown;
  deliveryAddress: unknown;
  parcelSize: string;
  amount: number;
  distanceKm: number;
}

export function signQuoteToken(data: QuoteTokenPayload): string {
  return jwt.sign(data, env.QUOTE_SECRET, { expiresIn: "10m" });
}

export function verifyQuoteToken(token: string): QuoteTokenPayload {
  return jwt.verify(token, env.QUOTE_SECRET) as QuoteTokenPayload;
}

// ─── Bulk quote token ───────────────────────────────────────────────────────

export interface BulkQuoteTokenPackage {
  amount: number;
  distanceKm: number;
}

export interface BulkQuoteTokenPayload {
  pickupAddress: unknown;
  packages: BulkQuoteTokenPackage[];
  total: number;
  count: number;
}

export function signBulkQuoteToken(data: BulkQuoteTokenPayload): string {
  return jwt.sign(data, env.QUOTE_SECRET, { expiresIn: "10m" });
}

export function verifyBulkQuoteToken(token: string): BulkQuoteTokenPayload {
  return jwt.verify(token, env.QUOTE_SECRET) as BulkQuoteTokenPayload;
}
