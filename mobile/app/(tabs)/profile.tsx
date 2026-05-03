import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearSession, getDriver } from "../../lib/auth";
import { colors, radii, spacing, typography } from "../../lib/theme";
import type { Driver } from "../../lib/types";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    getDriver().then(setDriver);
  }, []);

  function onLogout() {
    Alert.alert("Sign out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          queryClient.clear();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        {driver && (
          <View style={styles.card}>
            <Text style={typography.h2}>{driver.name}</Text>
            <Text style={[typography.muted, { marginTop: spacing.xs }]}>{driver.phone}</Text>
            <View style={{ height: spacing.md }} />
            <Field label="Vehicle" value={driver.vehicleType} />
            {driver.vehiclePlate && <Field label="Plate" value={driver.vehiclePlate} />}
            {driver.email && <Field label="Email" value={driver.email} />}
          </View>
        )}

        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs }}>
      <Text style={typography.label}>{label}</Text>
      <Text style={typography.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logout: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontWeight: "600", fontSize: 16 },
});
