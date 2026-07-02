import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getOrderById } from "@/services/orderService";
import { Order } from "@/types/order";

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  PENDING_PAYMENT: "Chờ thanh toán",
  PENDING: "Đang xử lý",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  READY_FOR_PICKUP: "Sẵn sàng lấy hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  FAILED: "Thất bại",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ONLINE_PAYMENT: "Thanh toán trực tuyến",
  COD: "Thanh toán khi nhận hàng (COD)",
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  BANK_TRANSFER: "Chuyển khoản",
  PAY_AT_STORE: "Thanh toán tại cửa hàng",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  DELIVERY: "Giao hàng tận nơi",
  STORE_PICKUP: "Nhận tại cửa hàng",
  IN_STORE: "Tại cửa hàng",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    if (!token || !id) {
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      const response = await getOrderById(token, id);
      setOrder(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const isDelivery = order?.fulfillmentType === "DELIVERY";
  const store =
    order && typeof order.storeId === "object" ? order.storeId : null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#252525" />
        </View>
      ) : error || !order ? (
        <View style={styles.centerState}>
          <Ionicons color="#9f2639" name="alert-circle-outline" size={28} />
          <Text style={styles.errorText}>
            {error || "Không tìm thấy đơn hàng."}
          </Text>
          <Pressable onPress={loadOrder} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.orderCodeRow}>
              <Text style={styles.orderCode}>{order.orderCode}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>

          <Text style={styles.sectionLabel}>
            {isDelivery ? "ĐỊA CHỈ NHẬN HÀNG" : "CỬA HÀNG NHẬN HÀNG"}
          </Text>
          <View style={styles.card}>
            <View style={styles.fulfillmentRow}>
              <Ionicons
                color="#2d5a4b"
                name={isDelivery ? "car-outline" : "storefront-outline"}
                size={18}
              />
              <Text style={styles.fulfillmentText}>
                {FULFILLMENT_LABELS[order.fulfillmentType] ??
                  order.fulfillmentType}
              </Text>
            </View>
            <View style={styles.divider} />
            {isDelivery && order.shippingAddress ? (
              <>
                <Text style={styles.infoLine}>
                  {order.shippingAddress.recipientName} ·{" "}
                  {order.shippingAddress.phone}
                </Text>
                <Text style={styles.infoLineMuted}>
                  {order.shippingAddress.addressLine}
                </Text>
              </>
            ) : store ? (
              <>
                <Text style={styles.infoLine}>{store.name}</Text>
                {store.address ? (
                  <Text style={styles.infoLineMuted}>{store.address}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.infoLineMuted}>Không có thông tin.</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>SẢN PHẨM</Text>
          <View style={styles.card}>
            {order.items.map((item) => (
              <View key={item.productId} style={styles.orderItemRow}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.orderItemThumbnail}
                />
                <Text numberOfLines={1} style={styles.orderItemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={styles.orderItemPrice}>
                  {formatPrice(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.orderItemRow}>
              <Text style={styles.summaryLabel}>Tạm tính</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.subtotal)}
              </Text>
            </View>
            <View style={styles.orderItemRow}>
              <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
              <Text style={styles.summaryValue}>
                {order.shippingFee === 0
                  ? "Miễn phí"
                  : formatPrice(order.shippingFee)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.orderItemRow}>
              <Text style={styles.subtotalLabel}>Tổng cộng</Text>
              <Text style={styles.subtotalValue}>
                {formatPrice(order.totalPrice)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>THANH TOÁN</Text>
          <View style={styles.card}>
            <View style={styles.fulfillmentRow}>
              <Ionicons color="#2d5a4b" name="card-outline" size={18} />
              <Text style={styles.fulfillmentText}>
                {(order.paymentMethod &&
                  PAYMENT_METHOD_LABELS[order.paymentMethod]) ??
                  "Chưa xác định"}
              </Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.infoLine}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                order.paymentStatus}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 10,
  },
  errorText: {
    color: "#5c5e5b",
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#252525",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
  },
  card: {
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  orderCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderCode: {
    color: "#212121",
    fontSize: 16,
    fontWeight: "900",
  },
  orderDate: {
    marginTop: 6,
    color: "#8c8e8a",
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#eaf2ee",
  },
  statusBadgeText: {
    color: "#2d5a4b",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionLabel: {
    marginBottom: 10,
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fulfillmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
  },
  fulfillmentText: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginBottom: 12,
    backgroundColor: "#f0f1ee",
  },
  infoLine: {
    color: "#3d3e3c",
    fontSize: 13,
    fontWeight: "700",
  },
  infoLineMuted: {
    marginTop: 4,
    color: "#8c8e8a",
    fontSize: 12,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
  },
  orderItemThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0f1ee",
  },
  orderItemName: {
    flex: 1,
    color: "#3d3e3c",
    fontSize: 13,
    fontWeight: "600",
  },
  orderItemPrice: {
    color: "#212121",
    fontSize: 13,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "#8c8e8a",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#3d3e3c",
    fontSize: 13,
    fontWeight: "700",
  },
  subtotalLabel: {
    color: "#6f716e",
    fontSize: 14,
    fontWeight: "700",
  },
  subtotalValue: {
    color: "#212121",
    fontSize: 17,
    fontWeight: "900",
  },
});
