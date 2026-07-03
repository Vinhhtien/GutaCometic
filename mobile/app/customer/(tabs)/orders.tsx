import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { cancelOrder, getOrders } from "@/services/orderService";
import { Order } from "@/types/order";

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

type StatusTabKey =
  | "pending"
  | "shipping"
  | "delivered"
  | "review"
  | "cancelled";

type StatusTab = {
  key: StatusTabKey;
  label: string;
  apiStatus: string;
};

const STATUS_TABS: StatusTab[] = [
  { key: "pending", label: "Chờ xác nhận", apiStatus: "PENDING" },
  {
    key: "shipping",
    label: "Chờ giao hàng",
    apiStatus: "PREPARING,READY_FOR_PICKUP",
  },
  { key: "delivered", label: "Đã giao", apiStatus: "COMPLETED" },
  { key: "review", label: "Đánh giá", apiStatus: "NEEDS_REVIEW" },
  { key: "cancelled", label: "Đã hủy", apiStatus: "CANCELLED" },
];

const FULFILLMENT_LABELS: Record<string, string> = {
  DELIVERY: "Giao hàng tận nơi",
  STORE_PICKUP: "Nhận tại cửa hàng",
  IN_STORE: "Tại cửa hàng",
};

const getFulfillmentSummary = (order: Order) =>
  FULFILLMENT_LABELS[order.fulfillmentType] ?? order.fulfillmentType;

const getActionLabel = (statusKey: StatusTabKey) => {
  switch (statusKey) {
    case "pending":
      return "Hủy đơn hàng";
    case "review":
      return "Viết đánh giá";
    default:
      return "Xem chi tiết";
  }
};

export default function OrdersScreen() {
  const { token } = useAuth();
  const [activeStatus, setActiveStatus] = useState<StatusTabKey>("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );

  const activeTab =
    STATUS_TABS.find((tab) => tab.key === activeStatus) ?? STATUS_TABS[0];

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        return;
      }

      try {
        setError("");
        isRefresh ? setIsRefreshing(true) : setIsLoading(true);
        const response = await getOrders(token, activeTab.apiStatus);
        setOrders(response);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, activeTab.apiStatus]
  );

  useEffect(() => {
    setIsLoading(true);
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Đồng ý",
          style: "destructive",
          onPress: async () => {
            if (!token) {
              return;
            }

            try {
              setCancellingOrderId(orderId);
              await cancelOrder(token, orderId);
              await loadOrders();
              Alert.alert("Thành công", "Đã hủy đơn hàng thành công");
            } catch (requestError) {
              Alert.alert("Không thể hủy đơn", getErrorMessage(requestError));
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const handleActionPress = (order: Order) => {
    if (activeStatus === "pending") {
      handleCancelOrder(order._id);
      return;
    }

    if (activeStatus === "review") {
      const firstItem = order.items[0];
      if (firstItem) {
        router.push({
          pathname: "/customer/product-detail",
          params: { id: firstItem.productId },
        });
      }
      return;
    }

    router.push({
      pathname: "/customer/order-detail",
      params: { id: order._id },
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.tabsRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = tab.key === activeStatus;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveStatus(tab.key)}
              style={styles.tabItem}
            >
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabIndicator,
                  isActive && styles.tabIndicatorActive,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

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
          style={styles.scrollBody}
        >
          <View style={styles.emptyIcon}>
            <Ionicons color="#2d5a4b" name="receipt-outline" size={26} />
          </View>
          <Text style={styles.emptyTitle}>Không có đơn hàng nào</Text>
          <Text style={styles.emptyMessage}>
            Đơn hàng thuộc trạng thái "{activeTab.label}" sẽ hiển thị ở đây.
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
          style={styles.scrollBody}
        >
          {orders.map((order) => {
            const firstItem = order.items[0];
            const isCancelling = cancellingOrderId === order._id;

            return (
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
                  <View style={styles.channelBadge}>
                    <Text style={styles.channelBadgeText}>
                      {order.channel === "ONLINE" ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderDate}>
                  {formatDate(order.createdAt)}
                </Text>

                <View style={styles.itemRow}>
                  {firstItem?.image ? (
                    <Image
                      source={{ uri: firstItem.image }}
                      style={styles.itemThumbnail}
                    />
                  ) : (
                    <View style={styles.itemThumbnailPlaceholder}>
                      <Ionicons
                        color="#c33e53"
                        name="leaf-outline"
                        size={18}
                      />
                    </View>
                  )}
                  <View style={styles.itemTextWrap}>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {firstItem?.name}
                      {order.items.length > 1
                        ? ` +${order.items.length - 1} sản phẩm khác`
                        : ""}
                    </Text>
                    <Text style={styles.itemFulfillment}>
                      {getFulfillmentSummary(order)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderCardBottom}>
                  <Text style={styles.orderTotal}>
                    {formatPrice(order.totalPrice)}
                  </Text>
                  <Pressable
                    disabled={isCancelling}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleActionPress(order);
                    }}
                    style={[
                      styles.actionButton,
                      activeStatus === "pending" && styles.actionButtonDanger,
                    ]}
                  >
                    {isCancelling ? (
                      <ActivityIndicator color="#252525" size="small" />
                    ) : (
                      <Text
                        style={[
                          styles.actionButtonText,
                          activeStatus === "pending" &&
                            styles.actionButtonTextDanger,
                        ]}
                      >
                        {getActionLabel(activeStatus)}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
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
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 22,
    borderBottomWidth: 1,
    borderColor: "#f0f1ee",
  },
  tabItem: {
    alignItems: "center",
    paddingBottom: 10,
  },
  tabLabel: {
    color: "#9a9c98",
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#252525",
    fontWeight: "800",
  },
  tabIndicator: {
    marginTop: 8,
    height: 2,
    width: "100%",
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  tabIndicatorActive: {
    backgroundColor: "#2d5a4b",
  },
  scrollBody: {
    flex: 1,
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
    paddingTop: 12,
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
  channelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#eaf2ee",
  },
  channelBadgeText: {
    color: "#2d5a4b",
    fontSize: 11,
    fontWeight: "800",
  },
  orderDate: {
    marginTop: 6,
    color: "#8c8e8a",
    fontSize: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f0f1ee",
  },
  itemThumbnailPlaceholder: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#fff0f2",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: "#212121",
    fontSize: 13,
    fontWeight: "700",
  },
  itemFulfillment: {
    marginTop: 4,
    color: "#8c8e8a",
    fontSize: 12,
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
  orderTotal: {
    color: "#212121",
    fontSize: 15,
    fontWeight: "900",
  },
  actionButton: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dedfdb",
    backgroundColor: "#f7f7f6",
  },
  actionButtonText: {
    color: "#252525",
    fontSize: 12,
    fontWeight: "800",
  },
  actionButtonDanger: {
    borderColor: "#f3c6cd",
    backgroundColor: "#fff0f2",
  },
  actionButtonTextDanger: {
    color: "#c33e53",
  },
});
