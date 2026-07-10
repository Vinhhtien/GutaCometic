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
import { getOrders } from "@/services/orderService";
import { Order } from "@/types/order";

const ACTIVE_STATUSES = "PENDING,PREPARING,READY_FOR_PICKUP";

type TaskCard = {
  badgeKey?: "delivery" | "online" | "pickup";
  description: string;
  group: "orders" | "store";
  href?: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

const TASKS: TaskCard[] = [
  {
    title: "Bán hàng tại cửa hàng",
    description: "Tạo đơn POS, quét sản phẩm, nhận thanh toán tại quầy.",
    group: "store",
    icon: "storefront-outline",
    href: "/manager/pos-payment" as Href,
  },
  {
    title: "Xác nhận đơn online",
    description: "Kiểm tra đơn khách đặt và xác nhận xử lý.",
    group: "orders",
    icon: "receipt-outline",
    href: "/manager/orders?module=onlineConfirm" as Href,
    badgeKey: "online",
  },
  {
    title: "Khách nhận tại store",
    description: "Kiểm tra mã đơn và xác nhận khách đã nhận hàng.",
    group: "orders",
    icon: "bag-check-outline",
    href: "/manager/orders?module=pickup" as Href,
    badgeKey: "pickup",
  },
  {
    title: "Giao hàng COD",
    description: "Theo dõi đơn giao cho shipper và hoàn tất COD.",
    group: "orders",
    icon: "bicycle-outline",
    href: "/manager/orders?module=delivery" as Href,
    badgeKey: "delivery",
  },
  {
    title: "Kiểm kho",
    description: "Theo dõi tồn kho, hàng giữ chỗ và cảnh báo thiếu hàng.",
    group: "store",
    icon: "cube-outline",
    href: "/manager/inventory" as Href,
  },
  {
    title: "Lịch sử kho",
    description: "Xem lịch sử nhập hàng, trừ hàng lỗi, hỏng hoặc hết hạn.",
    group: "store",
    icon: "file-tray-full-outline",
    href: "/manager/inventory-history" as Href,
  },
  {
    title: "Nhập hàng điều chuyển",
    description: "Xác nhận hàng từ kho tổng hoặc chi nhánh khác.",
    group: "store",
    icon: "swap-horizontal-outline",
  },
  {
    title: "Lịch sử đơn hàng",
    description: "Tra cứu các đơn đã xử lý tại chi nhánh.",
    group: "store",
    icon: "time-outline",
    href: "/manager/history" as Href,
  },
];

const formatDate = () =>
  new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
  });

export default function ManagerHomeScreen() {
  const { activeStore, logout, token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        if (mode === "refresh") {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await getOrders(
          token,
          ACTIVE_STATUSES,
          undefined,
          "ONLINE"
        );
        setOrders(response);
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

  const stats = useMemo(
    () => ({
      delivery: orders.filter(
        (order) =>
          order.fulfillmentType === "DELIVERY" && order.status === "PREPARING"
      ).length,
      online: orders.filter((order) => order.status === "PENDING").length,
      pickup: orders.filter(
        (order) =>
          order.fulfillmentType === "STORE_PICKUP" &&
          order.status === "READY_FOR_PICKUP"
      ).length,
      total: orders.length,
    }),
    [orders]
  );

  const handleOpenTask = (task: TaskCard) => {
    if (task.href) {
      router.push(task.href);
      return;
    }

    router.push(
      `/manager/placeholder?title=${encodeURIComponent(task.title)}&description=${encodeURIComponent(
        task.description
      )}` as Href
    );
  };

  const orderTasks = TASKS.filter((task) => task.group === "orders");
  const storeTasks = TASKS.filter((task) => task.group === "store");

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GUTA COSMETIC</Text>
          <Text style={styles.title}>Quản lý chi nhánh</Text>
          <Text style={styles.subtitle}>
            {user?.fullName} · {activeStore?.name || "Chưa chọn chi nhánh"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/staff/select-store")}
            style={styles.iconButton}
          >
            <Ionicons color="#252525" name="storefront-outline" size={20} />
          </Pressable>
          <Pressable onPress={logout} style={styles.iconButton}>
            <Ionicons color="#252525" name="log-out-outline" size={21} />
          </Pressable>
        </View>
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
        <View style={styles.shiftPanel}>
          <View>
            <Text style={styles.shiftLabel}>Tổng quan vận hành</Text>
            <Text style={styles.shiftDate}>{formatDate()}</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#252525" />
          ) : (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Đang hoạt động</Text>
            </View>
          )}
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.online}</Text>
            <Text style={styles.metricLabel}>Chờ xác nhận</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.pickup}</Text>
            <Text style={styles.metricLabel}>Chờ khách nhận</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.delivery}</Text>
            <Text style={styles.metricLabel}>Đang giao COD</Text>
          </View>
        </View>

        <TaskSection
          onOpenTask={handleOpenTask}
          stats={stats}
          tasks={orderTasks}
          title="Vận hành đơn hàng"
        />

        <TaskSection
          onOpenTask={handleOpenTask}
          stats={stats}
          tasks={storeTasks}
          title="Quản trị chi nhánh"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskSection({
  onOpenTask,
  stats,
  tasks,
  title,
}: {
  onOpenTask: (task: TaskCard) => void;
  stats: { delivery: number; online: number; pickup: number; total: number };
  tasks: TaskCard[];
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.taskGrid}>
        {tasks.map((task) => {
          const badgeValue = task.badgeKey ? stats[task.badgeKey] : 0;

          return (
            <Pressable
              key={task.title}
              onPress={() => onOpenTask(task)}
              style={({ pressed }) => [
                styles.taskCard,
                pressed && styles.taskCardPressed,
              ]}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskIcon}>
                  <Ionicons color="#252525" name={task.icon} size={22} />
                </View>
                {badgeValue > 0 ? (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{badgeValue}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDescription}>{task.description}</Text>
              <View style={styles.taskFooter}>
                <Text style={styles.taskFooterText}>Mở màn hình</Text>
                <Ionicons color="#52605a" name="chevron-forward" size={17} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7f4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  eyebrow: {
    color: "#60716a",
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 25,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 13,
    fontWeight: "700",
  },
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
  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  shiftPanel: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  shiftLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  shiftDate: {
    marginTop: 5,
    color: "#c9d4ce",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2d8a57",
  },
  activeBadgeText: {
    color: "#2d5a4b",
    fontSize: 12,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 76,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: {
    color: "#1f2522",
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 11,
    fontWeight: "800",
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  taskGrid: {
    gap: 10,
  },
  taskCard: {
    minHeight: 136,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  taskCardPressed: {
    opacity: 0.82,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  taskBadge: {
    minWidth: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#9f2639",
  },
  taskBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  taskTitle: {
    marginTop: 12,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  taskDescription: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  taskFooterText: {
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
});
