import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api } from "../../../lib/api";
import { openMaps } from "../../../lib/maps";
import { STATUS_LABEL, nextActionsFor, type StatusAction } from "../../../lib/status";
import { colors, radii, spacing, typography } from "../../../lib/theme";
import type { Address } from "../../../lib/types";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id!),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (action: StatusAction) => api.updateStatus(id!, action.next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Could not update status.";
      Alert.alert("Update failed", msg);
    },
    onSettled: () => setPendingAction(null),
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const order = query.data?.order;
  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>Order not found.</Text>
      </View>
    );
  }

  const actions = nextActionsFor(order.status);

  function runAction(action: StatusAction) {
    if (action.requiresPod) {
      router.push(`/orders/${id}/pod`);
      return;
    }
    setPendingAction(action.next);
    mutation.mutate(action);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: `#${order.trackingNumber}` }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={typography.h2}>Status</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{STATUS_LABEL[order.status]}</Text>
            </View>
          </View>
        </View>

        <AddressCard title="Pickup" address={order.pickupAddress} />
        <AddressCard title="Delivery" address={order.deliveryAddress} />

        <View style={styles.card}>
          <Text style={typography.h2}>Receiver</Text>
          <Text style={[typography.body, { marginTop: spacing.sm }]}>{order.receiverPhone}</Text>
          {order.receiverEmail ? <Text style={typography.muted}>{order.receiverEmail}</Text> : null}
        </View>

        {order.parcelDetails?.description ? (
          <View style={styles.card}>
            <Text style={typography.h2}>Parcel</Text>
            <Text style={[typography.body, { marginTop: spacing.sm }]}>
              {order.parcelDetails.description}
            </Text>
          </View>
        ) : null}

        {actions.length > 0 && (
          <View style={{ gap: spacing.md }}>
            {actions.map((action) => (
              <Pressable
                key={action.next}
                onPress={() => runAction(action)}
                disabled={mutation.isPending}
                style={({ pressed }) => [
                  styles.actionButton,
                  action.variant === "danger" && { backgroundColor: colors.danger },
                  action.variant === "warning" && { backgroundColor: colors.warning },
                  (pressed || mutation.isPending) && { opacity: 0.7 },
                ]}
              >
                {pendingAction === action.next ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionText}>{action.label}</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AddressCard({ title, address }: { title: string; address: Address }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={typography.h2}>{title}</Text>
        <Pressable onPress={() => openMaps(address)} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Navigate</Text>
        </Pressable>
      </View>
      <Text style={[typography.body, { marginTop: spacing.sm }]}>{address.street}</Text>
      {address.suburb ? <Text style={typography.muted}>{address.suburb}</Text> : null}
      <Text style={typography.muted}>
        {[address.city, address.postalCode, address.province].filter(Boolean).join(" · ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: "600" },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
