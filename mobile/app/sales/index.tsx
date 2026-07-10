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

type ActionItem = {
  description: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

const primaryActions: ActionItem[] = [
  {
    title: "Tư vấn & tạo giỏ",
    description: "Tra cứu sản phẩm, kiểm tồn và tạo giỏ tại quầy.",
    icon: "sparkles-outline",
    href: "/sales/offline-order" as Href,
  },
  {
    title: "Gửi thu ngân",
    description: "Duyệt giỏ tạm để Manager thanh toán.",
    icon: "send-outline",
    href: "/sales/offline-order?section=pending" as Href,
  },
];

const secondaryActions: ActionItem[] = [
  {
    title: "Tra cứu sản phẩm",
    description: "Tìm theo tên, SKU, brand, loại da.",
    icon: "search-outline",
    href: "/sales/offline-order?section=catalog" as Href,
  },
  {
    title: "Kiểm tồn kho",
    description: "Xem tồn chi nhánh và tồn hệ thống.",
    icon: "cube-outline",
    href: "/sales/offline-order?section=inventory" as Href,
  },
  {
    title: "Lịch sử đơn",
    description: "Theo dõi đơn đã tạo và đã gửi thu ngân.",
    icon: "time-outline",
    href: "/sales/offline-order?section=history" as Href,
  },
];

export default function SalesHomeScreen() {
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
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
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

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SALES DASHBOARD</Text>
          <Text style={styles.title}>Nhân viên tại quầy</Text>
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
        <View style={styles.overviewPanel}>
          <View style={styles.overviewCopy}>
            <Text style={styles.overviewTitle}>Ca bán tại cửa hàng</Text>
            <Text style={styles.overviewText}>
              Tư vấn khách, tạo giỏ tạm và gửi sang thu ngân.
            </Text>
          </View>
          <View style={styles.pendingBox}>
            {isLoading ? (
              <ActivityIndicator color="#252525" />
            ) : (
              <>
                <Text style={styles.pendingValue}>{pendingApprovalCount}</Text>
                <Text style={styles.pendingLabel}>giỏ chờ</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.primaryGrid}>
          {primaryActions.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Công cụ nhanh</Text>
        <View style={styles.secondaryList}>
          {secondaryActions.map((action) => (
            <ActionRow key={action.title} action={action} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  return (
    <Pressable
      onPress={() => router.push(action.href)}
      style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Ionicons color="#252525" name={action.icon} size={22} />
      </View>
      <Text style={styles.primaryTitle}>{action.title}</Text>
      <Text style={styles.primaryDescription}>{action.description}</Text>
    </Pressable>
  );
}

function ActionRow({ action }: { action: ActionItem }) {
  return (
    <Pressable
      onPress={() => router.push(action.href)}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons color="#252525" name={action.icon} size={20} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{action.title}</Text>
        <Text style={styles.rowDescription}>{action.description}</Text>
      </View>
      <Ionicons color="#52605a" name="chevron-forward" size={18} />
    </Pressable>
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
  headerActions: { flexDirection: "row", gap: 8 },
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
  overviewPanel: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  overviewCopy: { flex: 1, minWidth: 0 },
  overviewTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  overviewText: {
    marginTop: 6,
    color: "#c9d4ce",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  pendingBox: {
    width: 72,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  pendingValue: { color: "#1f2522", fontSize: 24, fontWeight: "900" },
  pendingLabel: { color: "#52605a", fontSize: 11, fontWeight: "900" },
  primaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryCard: {
    flex: 1,
    minHeight: 150,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  primaryTitle: {
    marginTop: 14,
    color: "#1f2522",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  primaryDescription: {
    marginTop: 6,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryList: { gap: 9 },
  actionRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  rowIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  rowDescription: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  pressed: { opacity: 0.82 },
});
