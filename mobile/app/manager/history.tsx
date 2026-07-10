import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Chưa có";
  }

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const statusLabel: Record<string, string> = {
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
  PENDING: "Chờ xác nhận",
  PENDING_APPROVAL: "Chờ Sales gửi",
  PENDING_PAYMENT: "Chờ thu ngân",
  PREPARING: "Đang xử lý",
  READY_FOR_PICKUP: "Sẵn sàng nhận",
};

const paymentStatusLabel: Record<string, string> = {
  FAILED: "Thanh toán lỗi",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
};

const paymentMethodLabel: Record<string, string> = {
  BANK_TRANSFER: "Chuyển khoản QR",
  CARD: "Thẻ",
  CASH: "Tiền mặt",
  COD: "COD",
  PAY_AT_STORE: "Thanh toán tại cửa hàng",
};

const channelLabel: Record<string, string> = {
  OFFLINE: "Tại quầy",
  ONLINE: "Online",
};

const fulfillmentLabel: Record<string, string> = {
  DELIVERY: "Giao hàng tận nơi",
  IN_STORE: "Mua tại cửa hàng",
  STORE_PICKUP: "Khách nhận tại store",
};

export default function ManagerHistoryScreen() {
  const { activeStore, token } = useAuth();
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

  const summary = useMemo(
    () => ({
      count: orders.length,
      paid: orders.filter((order) => order.paymentStatus === "PAID").length,
      total: orders.reduce((sum, order) => sum + order.totalPrice, 0),
    }),
    [orders]
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>QUẢN LÝ CHI NHÁNH</Text>
          <Text style={styles.title}>Lịch sử đơn hàng</Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {activeStore?.name || "Chi nhánh đang chọn"}
          </Text>
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
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              <SummaryBox label="Tổng đơn" value={String(summary.count)} />
              <SummaryBox label="Đã thanh toán" value={String(summary.paid)} />
              <SummaryBox label="Doanh thu" value={formatCurrency(summary.total)} />
            </View>
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
                    {channelLabel[item.channel] || item.channel} ·{" "}
                    {item.customerName || "Khách vãng lai"} ·{" "}
                    {item.items.length} sản phẩm
                  </Text>
                  <Text style={styles.orderTime}>
                    Tạo lúc {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.totalBox}>
                  <Text style={styles.orderTotal}>
                    {formatCurrency(item.totalPrice)}
                  </Text>
                  <Ionicons color="#7c8781" name="chevron-forward" size={18} />
                </View>
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
                  {paymentStatusLabel[item.paymentStatus] || item.paymentStatus}
                </Text>
                <Text style={styles.statusPill}>
                  {paymentMethodLabel[item.paymentMethod || ""] ||
                    "Chưa chọn thanh toán"}
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

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function OrderDetailModal({
  onClose,
  order,
}: {
  onClose: () => void;
  order: Order | null;
}) {
  const customer =
    typeof order?.customerId === "object" ? order.customerId : undefined;
  const store = typeof order?.storeId === "object" ? order.storeId : undefined;

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
            <View style={styles.sheetTitleBox}>
              <Text style={styles.sheetTitle}>Chi tiết đơn hàng</Text>
              <Text style={styles.sheetSubtitle}>{order?.orderCode}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#252525" name="close" size={22} />
            </Pressable>
          </View>

          {order ? (
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailSection}>
                <DetailRow
                  label="Trạng thái đơn"
                  value={statusLabel[order.status] || order.status}
                />
                <DetailRow
                  label="Thanh toán"
                  value={paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
                />
                <DetailRow
                  label="Phương thức"
                  value={
                    paymentMethodLabel[order.paymentMethod || ""] ||
                    "Chưa chọn thanh toán"
                  }
                />
                <DetailRow
                  label="Kênh bán"
                  value={channelLabel[order.channel] || order.channel}
                />
                <DetailRow
                  label="Hình thức nhận"
                  value={
                    fulfillmentLabel[order.fulfillmentType] ||
                    order.fulfillmentType
                  }
                />
                <DetailRow label="Chi nhánh" value={store?.name || "Chi nhánh hiện tại"} />
              </View>

              <View style={styles.detailSection}>
                <DetailRow label="Thời gian tạo" value={formatDateTime(order.createdAt)} />
                <DetailRow label="Thời gian thanh toán" value={formatDateTime(order.paidAt)} />
                <DetailRow label="Thời gian hoàn tất" value={formatDateTime(order.completedAt)} />
                <DetailRow label="Cập nhật gần nhất" value={formatDateTime(order.updatedAt)} />
                {order.paymentReference ? (
                  <DetailRow label="Mã giao dịch" value={order.paymentReference} />
                ) : null}
              </View>

              <View style={styles.detailSection}>
                <DetailRow
                  label="Khách hàng"
                  value={customer?.fullName || order.customerName || "Khách vãng lai"}
                />
                <DetailRow
                  label="Số điện thoại"
                  value={customer?.phone || order.customerPhone || "Chưa có"}
                />
                {customer?.points !== undefined ? (
                  <DetailRow
                    label="Điểm hiện có"
                    value={`${customer.points.toLocaleString("vi-VN")} điểm`}
                  />
                ) : null}
                {order.shippingAddress ? (
                  <DetailRow
                    label="Địa chỉ"
                    value={`${order.shippingAddress.recipientName} · ${order.shippingAddress.phone} · ${order.shippingAddress.addressLine}`}
                  />
                ) : null}
              </View>

              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Sản phẩm</Text>
                {order.items.map((item) => (
                  <View key={`${order._id}-${item.productId}`} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text numberOfLines={2} style={styles.itemName}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(item.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalSection}>
                <DetailRow label="Tạm tính" value={formatCurrency(order.subtotal)} />
                <DetailRow label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
                <DetailRow label="Giảm giá" value={`-${formatCurrency(order.discountAmount || 0)}`} />
                <DetailRow
                  label="Điểm đã cộng"
                  value={`${Number(order.pointsEarned || 0).toLocaleString("vi-VN")} điểm`}
                />
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.grandTotalValue}>
                    {formatCurrency(order.totalPrice)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  subtitle: { marginTop: 3, color: "#6f7a74", fontSize: 13, fontWeight: "700" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mutedText: { color: "#6f7a74", fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: 18, paddingBottom: 30 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  summaryBox: {
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  summaryLabel: { color: "#6f7a74", fontSize: 11, fontWeight: "800" },
  summaryValue: { marginTop: 5, color: "#1f2522", fontSize: 16, fontWeight: "900" },
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
  orderTime: { marginTop: 4, color: "#8a948f", fontSize: 11, fontWeight: "700" },
  totalBox: { alignItems: "flex-end", justifyContent: "space-between" },
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
    maxHeight: "88%",
    paddingTop: 18,
    paddingHorizontal: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    paddingBottom: 12,
  },
  sheetTitleBox: { flex: 1, minWidth: 0 },
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
  sheetContent: { paddingBottom: 28, gap: 12 },
  detailSection: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7f9f6",
    borderWidth: 1,
    borderColor: "#e7ebe4",
    gap: 10,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  detailLabel: { flex: 0.9, color: "#6f7a74", fontSize: 12, fontWeight: "800" },
  detailValue: {
    flex: 1.25,
    color: "#1f2522",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    lineHeight: 17,
  },
  itemsSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7ebe4",
  },
  sectionTitle: { color: "#1f2522", fontSize: 14, fontWeight: "900" },
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
  totalSection: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7f9f6",
    borderWidth: 1,
    borderColor: "#e7ebe4",
    gap: 10,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e1e6de",
  },
  grandTotalLabel: { color: "#1f2522", fontSize: 14, fontWeight: "900" },
  grandTotalValue: { color: "#2d5a4b", fontSize: 17, fontWeight: "900" },
});
