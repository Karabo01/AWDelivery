import * as SecureStore from "expo-secure-store";
import type { Driver } from "./types";

const TOKEN_KEY = "awdelivery_driver_token";
const DRIVER_KEY = "awdelivery_driver_profile";

export async function saveSession(token: string, driver: Driver): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(driver));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getDriver(): Promise<Driver | null> {
  const raw = await SecureStore.getItemAsync(DRIVER_KEY);
  return raw ? (JSON.parse(raw) as Driver) : null;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(DRIVER_KEY);
}
