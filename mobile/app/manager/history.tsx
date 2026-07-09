import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getOrders } from "@/services/orderService";
import { Order } from "@/types/order";

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const statusLabel: Record<string, string> = {
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
  PENDING: "Chờ xác nhận",
  PENDING_APPROVAL: "Chờ Sales gửi",
  PENDING_PAYMENT: "Chờ thu ngân",
  PREPARING: "Đang xử lý",
  READY_FOR_PICKUP: "Sẵn sàng nhận",
};

const paymentLabel: Record<string, string> = {
  FAILED: "Thanh toán lỗi",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
};

export default function ManagerHistoryScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const response = await getOrders(token);
        setOrders(response);
      } catch (error) {
        Alert.alert("Không tải được lịch sử", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>QUẢN LÝ CHI NHÁNH</Text>
          <Text style={styles.title}>Lịch sử đơn hàng</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải lịch sử...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadOrders("refresh")}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons color="#7c8781" name="time-outline" size={30} />
              <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
              <Text style={styles.emptyText}>
                Các đơn online và offline của chi nhánh sẽ xuất hiện tại đây.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedOrder(item)}
              style={styles.orderCard}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderCode}>{item.orderCode}</Text>
                  <Text style={styles.orderMeta}>
                    {item.channel} · {item.customerName || "Khách vãng lai"} ·{" "}
                    {item.items.length} sản phẩm
                  </Text>
                </View>
                <Text style={styles.orderTotal}>
                  {formatCurrency(item.totalPrice)}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusPill}>
                  {statusLabel[item.status] || item.status}
                </Text>
                <Text
                  style={[
                    styles.statusPill,
                    item.paymentStatus === "PAID" && styles.statusPillPaid,
                  ]}
                >
                  {paymentLabel[item.paymentStatus] || item.paymentStatus}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </SafeAreaView>
  );
}

function OrderDetailModal({
  onClose,
  order,
}: {
  onClose: () => void;
  order: Order | null;
}) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={Boolean(order)}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Chi tiết đơn hàng</Text>
              <Text style={styles.sheetSubtitle}>{order?.orderCode}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#252525" name="close" size={22} />
            </Pressable>
          </View>

          {order?.items.map((item) => (
            <View key={`${order._id}-${item.productId}`} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text numberOfLines={2} style={styles.itemName}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta}>
                  {formatCurrency(item.unitPrice)} x{item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
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
  headerCopy: { flex: 1 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { marginTop: 3, color: "#1f2522", fontSize: 24, fontWeight: "900" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mutedText: { color: "#6f7a74", fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: 18, paddingBottom: 30 },
  emptyBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyTitle: { color: "#1f2522", fontSize: 17, fontWeight: "900" },
  emptyText: { color: "#6f7a74", textAlign: "center", lineHeight: 19, fontWeight: "600" },
  orderCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  orderInfo: { flex: 1, minWidth: 0 },
  orderCode: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  orderMeta: { marginTop: 5, color: "#69756f", fontSize: 12, fontWeight: "700" },
  orderTotal: { color: "#2d5a4b", fontSize: 16, fontWeight: "900" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f4ef",
    color: "#52605a",
    fontSize: 11,
    fontWeight: "900",
  },
  statusPillPaid: { backgroundColor: "#e8f4ec", color: "#2d5a4b" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: {
    maxHeight: "84%",
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  sheetTitle: { color: "#1f2522", fontSize: 19, fontWeight: "900" },
  sheetSubtitle: { marginTop: 4, color: "#6f7a74", fontSize: 13, fontWeight: "700" },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#f1f4ef",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  itemInfo: { flex: 1 },
  itemName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  itemMeta: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "700" },
  itemTotal: { color: "#2d5a4b", fontSize: 13, fontWeight: "900" },
});
