import { Linking, Platform } from "react-native";
import type { Address } from "./types";

function formatAddress(a: Address): string {
  return [a.street, a.suburb, a.city, a.postalCode, a.province]
    .filter(Boolean)
    .join(", ");
}

export async function openMaps(address: Address): Promise<void> {
  const coords = address.coordinates;
  const label = encodeURIComponent(formatAddress(address));

  let url: string;
  if (coords) {
    url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${coords.lat},${coords.lng}`
        : `geo:${coords.lat},${coords.lng}?q=${coords.lat},${coords.lng}(${label})`;
  } else {
    url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}`
        : `geo:0,0?q=${label}`;
  }

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return;
  }
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${label}`);
}
