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

type TaskCard = {
  badge?: number;
  description: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

export default function SalesHomeScreen() {
  const { logout, token, user } = useAuth();
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
          "PENDING_APPROVAL",
          undefined,
          "OFFLINE"
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

  const pendingApprovalCount = useMemo(
    () => orders.filter((order) => order.status === "PENDING_APPROVAL").length,
    [orders]
  );

  const tasks: TaskCard[] = [
    {
      title: "Tư vấn & tạo giỏ hàng",
      description: "Tìm sản phẩm, lọc theo nhu cầu và tạo đơn tại quầy.",
      icon: "sparkles-outline",
      href: "/sales/offline-order" as Href,
    },
    {
      title: "Đẩy đơn sang thu ngân",
      description: "Duyệt đơn tư vấn để Manager thanh toán POS.",
      icon: "send-outline",
      href: "/sales/offline-order?section=pending" as Href,
      badge: pendingApprovalCount,
    },
    {
      title: "Tra cứu sản phẩm",
      description: "Kiểm tra giá, loại da phù hợp và thông tin sản phẩm.",
      icon: "search-outline",
      href: "/sales/offline-order?section=catalog" as Href,
    },
    {
      title: "Kiểm tồn kho nhanh",
      description: "Xem khả dụng tại chi nhánh trước khi tư vấn khách.",
      icon: "cube-outline",
      href: "/sales/placeholder?title=Kiểm tồn kho nhanh" as Href,
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SALES DASHBOARD</Text>
          <Text style={styles.title}>Nhân viên tại quầy</Text>
          <Text style={styles.subtitle}>{user?.fullName} · Tư vấn bán hàng</Text>
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
        <View style={styles.shiftPanel}>
          <View>
            <Text style={styles.shiftLabel}>Luồng tại quầy</Text>
            <Text style={styles.shiftText}>
              Tư vấn khách → tạo đơn → đẩy sang thu ngân
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#252525" />
          ) : (
            <View style={styles.countBadge}>
              <Text style={styles.countValue}>{pendingApprovalCount}</Text>
              <Text style={styles.countLabel}>đơn chờ</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Tác vụ bán hàng</Text>
        <View style={styles.taskGrid}>
          {tasks.map((task) => (
            <Pressable
              key={task.title}
              onPress={() => router.push(task.href)}
              style={({ pressed }) => [
                styles.taskCard,
                pressed && styles.taskCardPressed,
              ]}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskIcon}>
                  <Ionicons color="#252525" name={task.icon} size={22} />
                </View>
                {task.badge ? (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{task.badge}</Text>
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
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
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
  content: { paddingHorizontal: 18, paddingBottom: 30 },
  shiftPanel: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  shiftLabel: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  shiftText: {
    marginTop: 5,
    color: "#c9d4ce",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  countBadge: {
    minWidth: 68,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  countValue: { color: "#1f2522", fontSize: 22, fontWeight: "900" },
  countLabel: { color: "#52605a", fontSize: 11, fontWeight: "900" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  taskGrid: { gap: 10 },
  taskCard: {
    minHeight: 136,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  taskCardPressed: { opacity: 0.82 },
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
  taskBadgeText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
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
  taskFooterText: { color: "#52605a", fontSize: 12, fontWeight: "900" },
});
