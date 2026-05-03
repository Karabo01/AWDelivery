import { StyleSheet } from "react-native";

export const colors = {
  primary: "#0f766e",
  primaryDark: "#115e59",
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#059669",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 6, md: 10, lg: 14 };

export const typography = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "700", color: colors.text },
  h2: { fontSize: 18, fontWeight: "600", color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
});
