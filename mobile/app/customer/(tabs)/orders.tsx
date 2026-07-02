import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

const MAX_PREVIEW_ITEMS = 3;

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

const getFulfillmentSummary = (order: Order) => {
  if (order.fulfillmentType === "DELIVERY") {
    return order.shippingAddress
      ? `Giao tới: ${order.shippingAddress.addressLine}`
      : "Giao hàng tận nơi";
  }

  const storeName =
    typeof order.storeId === "object" ? order.storeId.name : null;

  return storeName
    ? `Nhận tại cửa hàng: ${storeName}`
    : "Nhận tại cửa hàng";
};

export default function OrdersScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        return;
      }

      try {
        setError("");
        isRefresh ? setIsRefreshing(true) : setIsLoading(true);
        const response = await getOrders(token);
        setOrders(response);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
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
        <Text style={styles.headerTitle}>Đơn hàng</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#252525" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons color="#9f2639" name="alert-circle-outline" size={28} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadOrders(true)}
              refreshing={isRefreshing}
            />
          }
        >
          <View style={styles.emptyIcon}>
            <Ionicons color="#2d5a4b" name="receipt-outline" size={26} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptyMessage}>
            Lịch sử đơn hàng của bạn sẽ hiển thị ở đây.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadOrders(true)}
              refreshing={isRefreshing}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {orders.map((order) => (
            <Pressable
              key={order._id}
              onPress={() =>
                router.push({
                  pathname: "/customer/order-detail",
                  params: { id: order._id },
                })
              }
              style={styles.orderCard}
            >
              <View style={styles.orderCardTop}>
                <Text style={styles.orderCode}>{order.orderCode}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderDate}>
                {formatDate(order.createdAt)}
              </Text>
              <Text numberOfLines={1} style={styles.fulfillmentSummary}>
                {getFulfillmentSummary(order)}
              </Text>

              <View style={styles.itemsPreviewRow}>
                {order.items.slice(0, MAX_PREVIEW_ITEMS).map((item) => (
                  <Image
                    key={item.productId}
                    source={{ uri: item.image }}
                    style={styles.itemThumbnail}
                  />
                ))}
                <View style={styles.itemsPreviewTextWrap}>
                  <Text numberOfLines={1} style={styles.itemsPreviewName}>
                    {order.items[0]?.name}
                    {order.items.length > 1
                      ? ` +${order.items.length - 1} sản phẩm khác`
                      : ""}
                  </Text>
                  <Text style={styles.itemsPreviewQuantity}>
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    sản phẩm
                  </Text>
                </View>
              </View>

              <View style={styles.orderCardBottom}>
                <Text style={styles.orderItemCount}>
                  {order.items.length} loại sản phẩm
                </Text>
                <Text style={styles.orderTotal}>
                  {formatPrice(order.totalPrice)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
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
  emptyState: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eaf2ee",
  },
  emptyTitle: {
    marginTop: 14,
    color: "#2d2e2c",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyMessage: {
    maxWidth: 290,
    marginTop: 7,
    color: "#747673",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 30,
  },
  orderCard: {
    marginBottom: 14,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderCode: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "900",
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
  orderDate: {
    marginTop: 6,
    color: "#8c8e8a",
    fontSize: 12,
  },
  fulfillmentSummary: {
    marginTop: 6,
    color: "#2d5a4b",
    fontSize: 12,
    fontWeight: "700",
  },
  itemsPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  itemThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0f1ee",
  },
  itemsPreviewTextWrap: {
    flex: 1,
  },
  itemsPreviewName: {
    color: "#3d3e3c",
    fontSize: 12,
    fontWeight: "600",
  },
  itemsPreviewQuantity: {
    marginTop: 2,
    color: "#8c8e8a",
    fontSize: 11,
  },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#f0f1ee",
  },
  orderItemCount: {
    color: "#6f716e",
    fontSize: 12,
    fontWeight: "600",
  },
  orderTotal: {
    color: "#212121",
    fontSize: 15,
    fontWeight: "900",
  },
});
