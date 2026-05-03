import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { STATUS_LABEL } from "../../lib/status";
import { colors, radii, spacing, typography } from "../../lib/theme";
import type { DriverOrder } from "../../lib/types";

export default function ActiveOrdersScreen() {
  const query = useQuery({
    queryKey: ["orders", "active"],
    queryFn: () => api.listOrders(),
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (query.error) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>Could not load orders.</Text>
        <Pressable onPress={() => query.refetch()} style={styles.retry}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const orders = query.data?.orders ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={[styles.center, { paddingTop: spacing.xxl }]}>
            <Text style={typography.h2}>No active orders</Text>
            <Text style={[typography.muted, { marginTop: spacing.xs }]}>
              New assignments will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </SafeAreaView>
  );
}

function OrderCard({ order }: { order: DriverOrder }) {
  return (
    <Link href={`/orders/${order.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.row}>
          <Text style={typography.h2}>#{order.trackingNumber}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{STATUS_LABEL[order.status]}</Text>
          </View>
        </View>
        <Text style={[typography.muted, { marginTop: spacing.sm }]}>Pickup</Text>
        <Text style={typography.body}>{formatAddress(order.pickupAddress)}</Text>
        <Text style={[typography.muted, { marginTop: spacing.sm }]}>Delivery</Text>
        <Text style={typography.body}>{formatAddress(order.deliveryAddress)}</Text>
      </Pressable>
    </Link>
  );
}

function formatAddress(a: DriverOrder["pickupAddress"]): string {
  return [a.street, a.suburb, a.city].filter(Boolean).join(", ");
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
  retry: { marginTop: spacing.md, padding: spacing.sm },
});
