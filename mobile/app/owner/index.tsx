import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
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
import { getInventoryAlerts } from "@/services/inventoryService";
import { getOrders } from "@/services/orderService";
import { getOwnerStores, getOwnerTransfers } from "@/services/ownerService";
import { ManagedStore, OwnerTransfer } from "@/types/owner";
import { Order } from "@/types/order";

type OwnerTask = {
  description: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

const TASKS: OwnerTask[] = [
  {
    title: "Dashboard doanh thu",
    description: "Theo dõi doanh thu toàn chuỗi, số đơn và hiệu suất từng cửa hàng.",
    href: "/owner/revenue" as Href,
    icon: "bar-chart-outline",
  },
  {
    title: "Sản phẩm & giá bán",
    description: "Tạo mới sản phẩm và cập nhật giá niêm yết dùng chung cho toàn chuỗi.",
    href: "/owner/products" as Href,
    icon: "pricetags-outline",
  },
  {
    title: "Quản lý cửa hàng",
    description: "Thêm, chỉnh sửa hoặc khóa cửa hàng mà không ảnh hưởng các luồng khác.",
    href: "/owner/stores" as Href,
    icon: "storefront-outline",
  },
  {
    title: "Quản lý nhân sự",
    description: "Tạo tài khoản nhân viên, gán role và theo dõi trạng thái hoạt động.",
    href: "/owner/staff" as Href,
    icon: "people-outline",
  },
  {
    title: "Tồn kho & cảnh báo",
    description: "Xem tồn kho từng chi nhánh, báo cáo sắp hết hàng và xác nhận hàng điều chuyển.",
    href: "/owner/inventory" as Href,
    icon: "cube-outline",
  },
  {
    title: "Stock transfer",
    description: "Tạo, theo dõi và hủy các phiếu điều chuyển hàng giữa kho tổng và chi nhánh.",
    href: "/owner/transfers" as Href,
    icon: "swap-horizontal-outline",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export default function OwnerHomeScreen() {
  const { logout, token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [pendingTransfers, setPendingTransfers] = useState<OwnerTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [nextOrders, nextStores, nextAlerts, nextTransfers] = await Promise.all([
          getOrders(token).catch(() => []),
          getOwnerStores(token, true).catch(() => []),
          getInventoryAlerts(token).catch(() => []),
          getOwnerTransfers(token, { status: "PENDING" }).catch(() => []),
        ]);
        setOrders(nextOrders);
        setStores(nextStores);
        setAlertsCount(nextAlerts.length);
        setPendingTransfers(nextTransfers);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
    const completedOrders = orders.filter((order) => order.status === "COMPLETED");

    return {
      alerts: alertsCount,
      completedOrders: completedOrders.length,
      paidRevenue: paidOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      pendingTransfers: pendingTransfers.length,
      stores: stores.filter((store) => store.isActive).length,
    };
  }, [alertsCount, orders, pendingTransfers.length, stores]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GUTA COSMETIC</Text>
          <Text style={styles.title}>Quản trị toàn chuỗi</Text>
          <Text style={styles.subtitle}>{user?.fullName} · Owner Console</Text>
        </View>
        <Pressable onPress={logout} style={styles.iconButton}>
          <Ionicons color="#252525" name="log-out-outline" size={21} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#252525"
            onRefresh={() => loadDashboard("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroPanel}>
          <Text style={styles.heroLabel}>Toàn cảnh vận hành</Text>
          <Text style={styles.heroValue}>{formatCurrency(metrics.paidRevenue)}</Text>
          <Text style={styles.heroMeta}>Doanh thu từ các đơn đã thanh toán</Text>
        </View>

        <View style={styles.metricRow}>
          <MetricCard label="Cửa hàng mở" value={String(metrics.stores)} />
          <MetricCard label="Cảnh báo kho" value={String(metrics.alerts)} />
        </View>
        <View style={styles.metricRow}>
          <MetricCard label="Đơn hoàn tất" value={String(metrics.completedOrders)} />
          <MetricCard
            label="Transfer chờ nhận"
            value={String(metrics.pendingTransfers)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasklist của bạn</Text>
          <View style={styles.cardList}>
            {TASKS.map((task) => (
              <Pressable
                key={task.title}
                onPress={() => router.push(task.href)}
                style={({ pressed }) => [
                  styles.taskCard,
                  pressed && styles.taskCardPressed,
                ]}
              >
                <View style={styles.taskIcon}>
                  <Ionicons color="#252525" name={task.icon} size={22} />
                </View>
                <View style={styles.taskCopy}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
                <Ionicons color="#69756f" name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhắc việc nhanh</Text>
          <View style={styles.noticeCard}>
            <Ionicons color="#2d5a4b" name="pulse-outline" size={20} />
            <Text style={styles.noticeText}>
              Hôm nay đang có {metrics.alerts} cảnh báo tồn kho và{" "}
              {metrics.pendingTransfers} phiếu điều chuyển đang chờ xác nhận.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#252525" />
            <Text style={styles.mutedText}>Đang tải số liệu dashboard...</Text>
          </View>
        ) : null}
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { marginTop: 3, color: "#1f2522", fontSize: 25, fontWeight: "900" },
  subtitle: { marginTop: 4, color: "#69756f", fontSize: 13, fontWeight: "700" },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  heroPanel: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  heroLabel: { color: "#c9d4ce", fontSize: 12, fontWeight: "900" },
  heroValue: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  heroMeta: { marginTop: 6, color: "#dbe4de", fontSize: 13, fontWeight: "700" },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metricCard: {
    flex: 1,
    minHeight: 80,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: { color: "#1f2522", fontSize: 23, fontWeight: "900" },
  metricLabel: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "800" },
  section: { marginTop: 18 },
  sectionTitle: { marginBottom: 10, color: "#1f2522", fontSize: 16, fontWeight: "900" },
  cardList: { gap: 10 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  taskCardPressed: { opacity: 0.82 },
  taskIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  taskDescription: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  noticeCard: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
    borderWidth: 1,
    borderColor: "#d9e4dc",
  },
  noticeText: {
    flex: 1,
    color: "#2d5a4b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  loadingBox: { alignItems: "center", gap: 10, marginTop: 18 },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
});
