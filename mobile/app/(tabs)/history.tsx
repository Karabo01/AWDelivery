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

export default function HistoryScreen() {
  const query = useQuery({
    queryKey: ["orders", "history"],
    queryFn: () => api.listOrders({ includeCompleted: true }),
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const completed = (query.data?.orders ?? []).filter(
    (o) => o.status === "DELIVERED" || o.status === "FAILED",
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={completed}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={[styles.center, { paddingTop: spacing.xxl }]}>
            <Text style={typography.muted}>No completed orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => <Row order={item} />}
      />
    </SafeAreaView>
  );
}

function Row({ order }: { order: DriverOrder }) {
  return (
    <Link href={`/orders/${order.id}`} asChild>
      <Pressable style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.h2}>#{order.trackingNumber}</Text>
          <Text style={typography.muted}>{order.deliveryAddress.city}</Text>
        </View>
        <Text
          style={[
            typography.label,
            { color: order.status === "DELIVERED" ? colors.success : colors.danger },
          ]}
        >
          {STATUS_LABEL[order.status]}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
});
