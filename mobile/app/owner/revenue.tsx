import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getOrders } from "@/services/orderService";
import { getOwnerStores } from "@/services/ownerService";
import { ChainRevenueStore, ManagedStore } from "@/types/owner";
import { Order } from "@/types/order";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const getStoreId = (order: Order) =>
  typeof order.storeId === "string" ? order.storeId : order.storeId?._id;

export default function OwnerRevenueScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [nextOrders, nextStores] = await Promise.all([
          getOrders(token).catch(() => []),
          getOwnerStores(token, true).catch(() => []),
        ]);
        setOrders(nextOrders);
        setStores(nextStores);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const analytics = useMemo(() => {
    const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const storeMap = new Map(stores.map((store) => [store._id, store]));
    const storeRevenueMap = new Map<string, ChainRevenueStore>();

    paidOrders.forEach((order) => {
      const storeId = getStoreId(order);

      if (!storeId) {
        return;
      }

      const existing = storeRevenueMap.get(storeId) || {
        store: storeMap.get(storeId) || null,
        orderCount: 0,
        paidOrderCount: 0,
        revenue: 0,
        onlineRevenue: 0,
        offlineRevenue: 0,
      };

      existing.orderCount += 1;
      existing.paidOrderCount += 1;
      existing.revenue += order.totalPrice;

      if (order.channel === "ONLINE") {
        existing.onlineRevenue += order.totalPrice;
      } else {
        existing.offlineRevenue += order.totalPrice;
      }

      storeRevenueMap.set(storeId, existing);
    });

    const monthlyRevenue = paidOrders
      .filter((order) => {
        const referenceDate = new Date(order.paidAt || order.updatedAt || order.createdAt);
        return (
          referenceDate.getMonth() === currentMonth &&
          referenceDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, order) => sum + order.totalPrice, 0);

    return {
      averageOrderValue:
        paidOrders.length > 0
          ? paidOrders.reduce((sum, order) => sum + order.totalPrice, 0) / paidOrders.length
          : 0,
      monthlyRevenue,
      paidRevenue: paidOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      paidOrders: paidOrders.length,
      stores: [...storeRevenueMap.values()].sort((left, right) => right.revenue - left.revenue),
      totalOrders: orders.length,
    };
  }, [orders, stores]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerRow}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>OWNER DASHBOARD</Text>
          <Text style={styles.title}>Doanh thu toàn chuỗi</Text>
          <Text style={styles.subtitle}>
            Tổng hợp từ toàn bộ đơn hàng đang có trong hệ thống
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tổng hợp số liệu doanh thu...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadData("refresh")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroPanel}>
            <Text style={styles.heroLabel}>Doanh thu đã thanh toán</Text>
            <Text style={styles.heroValue}>{formatCurrency(analytics.paidRevenue)}</Text>
            <Text style={styles.heroMeta}>
              {analytics.paidOrders} đơn đã thanh toán trên toàn chuỗi
            </Text>
          </View>

          <View style={styles.metricRow}>
            <MetricCard
              label="Tháng này"
              value={formatCurrency(analytics.monthlyRevenue)}
            />
            <MetricCard label="Giá trị TB/đơn" value={formatCurrency(analytics.averageOrderValue)} />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Tổng số đơn" value={String(analytics.totalOrders)} />
            <MetricCard label="Đơn đã thu tiền" value={String(analytics.paidOrders)} />
          </View>

          <Text style={styles.sectionTitle}>Doanh thu theo cửa hàng</Text>
          <View style={styles.cardList}>
            {analytics.stores.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>Chưa có đơn đã thanh toán để tổng hợp.</Text>
              </View>
            ) : (
              analytics.stores.map((entry) => (
                <View key={entry.store?._id || "unknown"} style={styles.storeCard}>
                  <Text style={styles.storeName}>{entry.store?.name || "Cửa hàng không xác định"}</Text>
                  <Text style={styles.storeMeta}>
                    {entry.paidOrderCount} đơn · {formatCurrency(entry.revenue)}
                  </Text>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitLabel}>Online</Text>
                    <Text style={styles.splitValue}>{formatCurrency(entry.onlineRevenue)}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitLabel}>Tại quầy</Text>
                    <Text style={styles.splitValue}>{formatCurrency(entry.offlineRevenue)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  headerCopy: { gap: 3 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { color: "#1f2522", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  heroPanel: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  heroLabel: { color: "#c9d4ce", fontSize: 12, fontWeight: "900" },
  heroValue: { marginTop: 8, color: "#ffffff", fontSize: 27, fontWeight: "900" },
  heroMeta: { marginTop: 6, color: "#dbe4de", fontSize: 13, fontWeight: "700" },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metricCard: {
    flex: 1,
    minHeight: 84,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: { color: "#1f2522", fontSize: 18, fontWeight: "900" },
  metricLabel: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "800" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  cardList: { gap: 10 },
  storeCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeName: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  storeMeta: { marginTop: 5, color: "#69756f", fontSize: 12, fontWeight: "700" },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  splitLabel: { color: "#52605a", fontSize: 12, fontWeight: "800" },
  splitValue: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  emptyPanel: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyText: {
    color: "#69756f",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
});
