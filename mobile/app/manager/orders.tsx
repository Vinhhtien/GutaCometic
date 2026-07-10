import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { getOrders, updateOnlineOrderStatus } from "@/services/orderService";
import { Order } from "@/types/order";

const ACTIVE_STATUSES = "PENDING,PREPARING,READY_FOR_PICKUP";

type ManagerModuleKey =
  | "pos"
  | "onlineConfirm"
  | "pickup"
  | "delivery"
  | "inventory"
  | "transfer"
  | "history";

type ActiveModuleConfig = {
  emptyText: string;
  filterOrder: (order: Order) => boolean;
  title: string;
  workflow: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  PREPARING: "Đang xử lý",
  READY_FOR_PICKUP: "Sẵn sàng nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  COD: "COD",
  PAY_AT_STORE: "Thanh toán tại cửa hàng",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  DELIVERY: "Giao hàng",
  STORE_PICKUP: "Nhận tại cửa hàng",
};

const MODULE_CONFIG: Record<ManagerModuleKey, ActiveModuleConfig> = {
  pos: {
    title: "Bán hàng tại cửa hàng",
    workflow: "Tạo đơn POS, nhận thanh toán và hoàn tất giao dịch tại quầy.",
    emptyText: "Chức năng POS sẽ được triển khai ở giai đoạn tiếp theo.",
    filterOrder: () => false,
  },
  onlineConfirm: {
    title: "Xác nhận đơn online",
    workflow:
      "Kiểm tra đơn khách đặt. Đơn nhận tại cửa hàng sẽ chuyển sang sẵn sàng nhận; đơn COD giao hàng sẽ chuyển sang chuẩn bị giao.",
    emptyText: "Không có đơn online đang chờ xác nhận.",
    filterOrder: (order) => order.status === "PENDING",
  },
  pickup: {
    title: "Khách nhận tại cửa hàng",
    workflow:
      "Khi khách đến store, kiểm tra mã đơn và bấm hoàn tất sau khi giao hàng.",
    emptyText: "Không có đơn đang chờ khách đến nhận.",
    filterOrder: (order) =>
      order.fulfillmentType === "STORE_PICKUP" &&
      order.status === "READY_FOR_PICKUP",
  },
  delivery: {
    title: "Giao hàng COD",
    workflow:
      "Theo dõi đơn giao hàng. Khi đã bàn giao và thu COD thành công, bấm hoàn tất đơn.",
    emptyText: "Không có đơn giao hàng đang xử lý.",
    filterOrder: (order) =>
      order.fulfillmentType === "DELIVERY" && order.status === "PREPARING",
  },
  inventory: {
    title: "Kiểm kho",
    workflow: "Theo dõi tồn kho và cảnh báo thiếu hàng tại chi nhánh.",
    emptyText: "Chức năng kiểm kho sẽ được triển khai ở giai đoạn tiếp theo.",
    filterOrder: () => false,
  },
  transfer: {
    title: "Nhập hàng điều chuyển",
    workflow: "Xác nhận hàng từ kho tổng hoặc chi nhánh khác chuyển về.",
    emptyText: "Chức năng điều chuyển sẽ được triển khai ở giai đoạn tiếp theo.",
    filterOrder: () => false,
  },
  history: {
    title: "Lịch sử đơn hàng",
    workflow: "Tra cứu các đơn đã hoàn tất hoặc đã hủy tại chi nhánh.",
    emptyText: "Lịch sử đơn hàng sẽ được mở rộng ở giai đoạn tiếp theo.",
    filterOrder: () => false,
  },
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const getStoreName = (order: Order) =>
  typeof order.storeId === "object" ? order.storeId.name : "Chi nhánh";

const getActionForOrder = (order: Order) => {
  if (order.status === "PENDING") {
    if (order.fulfillmentType === "STORE_PICKUP") {
      return {
        icon: "bag-check-outline" as const,
        label: "Xác nhận sẵn sàng nhận",
        nextStatus: "READY_FOR_PICKUP",
      };
    }

    return {
      icon: "bicycle-outline" as const,
      label: "Chuyển sang giao hàng COD",
      nextStatus: "PREPARING",
    };
  }

  if (order.status === "PREPARING" && order.fulfillmentType === "DELIVERY") {
    return {
      icon: "checkmark-circle-outline" as const,
      label: "Hoàn tất giao hàng COD",
      nextStatus: "COMPLETED",
    };
  }

  if (order.status === "READY_FOR_PICKUP") {
    return {
      icon: "receipt-outline" as const,
      label: "Khách đã nhận hàng",
      nextStatus: "COMPLETED",
    };
  }

  return null;
};

export default function ManagerDashboardScreen() {
  const { module } = useLocalSearchParams<{ module?: ManagerModuleKey }>();
  const { activeStore, logout, token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeModule] =
    useState<ManagerModuleKey>(module || "onlineConfirm");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        setError("");
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

  const activeConfig = MODULE_CONFIG[activeModule];
  const visibleOrders = useMemo(
    () => orders.filter(activeConfig.filterOrder),
    [activeConfig, orders]
  );

  const replaceOrderInState = (updatedOrder: Order) => {
    setOrders((currentOrders) =>
      updatedOrder.status === "COMPLETED"
        ? currentOrders.filter((item) => item._id !== updatedOrder._id)
        : currentOrders.map((item) =>
            item._id === updatedOrder._id ? updatedOrder : item
          )
    );
    setSelectedOrder((currentOrder) =>
      currentOrder?._id === updatedOrder._id ? updatedOrder : currentOrder
    );
  };

  const handleUpdateOrder = async (order: Order) => {
    const action = getActionForOrder(order);

    if (!token || !action || updatingOrderId) {
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      const updatedOrder = await updateOnlineOrderStatus(
        token,
        order._id,
        action.nextStatus
      );

      replaceOrderInState(updatedOrder);

      if (updatedOrder.status === "COMPLETED") {
        setSelectedOrder(null);
      }
    } catch (requestError) {
      Alert.alert("Không thể cập nhật đơn", getErrorMessage(requestError));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const action = getActionForOrder(item);
    const isUpdating = updatingOrderId === item._id;

    return (
      <View style={styles.orderCard}>
        <Pressable onPress={() => setSelectedOrder(item)}>
          <View style={styles.orderHeader}>
            <View style={styles.orderCodeWrap}>
              <Text style={styles.orderCode}>{item.orderCode}</Text>
              <Text style={styles.orderMeta}>
                {formatDate(item.createdAt)} · {getStoreName(item)}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </View>

          <View style={styles.customerRow}>
            <Ionicons color="#52605a" name="person-outline" size={17} />
            <Text style={styles.customerText}>
              {item.customerName || "Khách online"}
              {item.customerPhone ? ` · ${item.customerPhone}` : ""}
            </Text>
          </View>

          <View style={styles.orderTypeRow}>
            <Text style={styles.orderTypeText}>
              {FULFILLMENT_LABELS[item.fulfillmentType] ?? item.fulfillmentType}
            </Text>
            <Text style={styles.orderTypeText}>
              {(item.paymentMethod &&
                PAYMENT_METHOD_LABELS[item.paymentMethod]) ||
                item.paymentMethod ||
                "Chưa xác định"}
            </Text>
          </View>

          <View style={styles.itemList}>
            {item.items.slice(0, 3).map((orderItem) => (
              <View
                key={`${item._id}-${orderItem.productId}`}
                style={styles.itemRow}
              >
                <Text numberOfLines={1} style={styles.itemName}>
                  {orderItem.name}
                </Text>
                <Text style={styles.itemQty}>x{orderItem.quantity}</Text>
              </View>
            ))}
            {item.items.length > 3 ? (
              <Text style={styles.moreItems}>
                +{item.items.length - 3} sản phẩm khác
              </Text>
            ) : null}
          </View>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Thanh toán</Text>
              <Text
                style={[
                  styles.paymentText,
                  item.paymentStatus === "PAID" && styles.paymentTextPaid,
                ]}
              >
                {PAYMENT_LABELS[item.paymentStatus] ?? item.paymentStatus}
              </Text>
            </View>
            <View style={styles.totalWrap}>
              <Text style={styles.summaryLabel}>Tổng tiền</Text>
              <Text style={styles.totalText}>{formatPrice(item.totalPrice)}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => setSelectedOrder(item)}
            style={styles.secondaryButton}
          >
            <Ionicons color="#252525" name="eye-outline" size={17} />
            <Text style={styles.secondaryButtonText}>Chi tiết</Text>
          </Pressable>

          {action ? (
            <Pressable
              disabled={isUpdating}
              onPress={() => handleUpdateOrder(item)}
              style={[
                styles.actionButton,
                isUpdating && styles.actionButtonDisabled,
              ]}
            >
              {isUpdating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons color="#ffffff" name={action.icon} size={18} />
                  <Text style={styles.actionButtonText}>{action.label}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={21} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>XỬ LÝ NGHIỆP VỤ</Text>
          <Text style={styles.title}>Đơn hàng chi nhánh</Text>
          <Text style={styles.subtitle}>
            {user?.fullName} · {activeStore?.name || "Chưa chọn chi nhánh"}
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Ionicons color="#252525" name="log-out-outline" size={21} />
        </Pressable>
      </View>

      <View style={styles.workflowBox}>
        <Text style={styles.workflowTitle}>{activeConfig.title}</Text>
        <Text style={styles.workflowText}>{activeConfig.workflow}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#252525" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons color="#9f2639" name="alert-circle-outline" size={30} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadOrders()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={visibleOrders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadOrders("refresh")}
            />
          }
          renderItem={renderOrder}
          ListHeaderComponent={
            visibleOrders.length > 0 ? (
              <Text style={styles.listTitle}>
                {visibleOrders.length} đơn cần xử lý
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons color="#747673" name="receipt-outline" size={34} />
              <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
              <Text style={styles.emptyText}>{activeConfig.emptyText}</Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
        transparent
        visible={Boolean(selectedOrder)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <Pressable
              accessibilityLabel="Đóng chi tiết đơn"
              onPress={() => setSelectedOrder(null)}
              style={styles.closeButton}
            >
              <Ionicons color="#252525" name="close" size={20} />
            </Pressable>

            {selectedOrder ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailTitle}>Chi tiết đơn hàng</Text>
                <Text style={styles.detailCode}>{selectedOrder.orderCode}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <Text style={styles.detailValue}>
                    {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hình thức</Text>
                  <Text style={styles.detailValue}>
                    {FULFILLMENT_LABELS[selectedOrder.fulfillmentType] ??
                      selectedOrder.fulfillmentType}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách hàng</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.customerName || "Khách online"}
                    {selectedOrder.customerPhone
                      ? ` · ${selectedOrder.customerPhone}`
                      : ""}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thanh toán</Text>
                  <Text style={styles.detailValue}>
                    {PAYMENT_LABELS[selectedOrder.paymentStatus] ??
                      selectedOrder.paymentStatus}
                  </Text>
                </View>

                {selectedOrder.shippingAddress ? (
                  <View style={styles.addressBox}>
                    <Text style={styles.addressTitle}>Địa chỉ nhận hàng</Text>
                    <Text style={styles.addressText}>
                      {selectedOrder.shippingAddress.recipientName} ·{" "}
                      {selectedOrder.shippingAddress.phone}
                    </Text>
                    <Text style={styles.addressText}>
                      {selectedOrder.shippingAddress.addressLine}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.detailSectionTitle}>Sản phẩm</Text>
                {selectedOrder.items.map((item) => (
                  <View
                    key={`${selectedOrder._id}-detail-${item.productId}`}
                    style={styles.detailItemRow}
                  >
                    <View style={styles.detailItemNameWrap}>
                      <Text numberOfLines={2} style={styles.detailItemName}>
                        {item.name}
                      </Text>
                      <Text style={styles.detailItemMeta}>
                        {formatPrice(item.unitPrice)} x {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.detailItemTotal}>
                      {formatPrice(item.lineTotal)}
                    </Text>
                  </View>
                ))}

                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Tổng cộng</Text>
                  <Text style={styles.detailTotalValue}>
                    {formatPrice(selectedOrder.totalPrice)}
                  </Text>
                </View>

                {getActionForOrder(selectedOrder) ? (
                  <Pressable
                    disabled={updatingOrderId === selectedOrder._id}
                    onPress={() => handleUpdateOrder(selectedOrder)}
                    style={[
                      styles.detailActionButton,
                      updatingOrderId === selectedOrder._id &&
                        styles.actionButtonDisabled,
                    ]}
                  >
                    {updatingOrderId === selectedOrder._id ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.detailActionButtonText}>
                        {getActionForOrder(selectedOrder)?.label}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  eyebrow: {
    color: "#60716a",
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 13,
    fontWeight: "600",
  },
  logoutButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  workflowBox: {
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  workflowTitle: {
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  workflowText: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 10,
    color: "#9f2639",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 28,
  },
  listTitle: {
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 14,
    fontWeight: "900",
  },
  orderCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  orderCodeWrap: {
    flex: 1,
  },
  orderCode: {
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  orderMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  statusBadgeText: {
    color: "#2d5a4b",
    fontSize: 11,
    fontWeight: "900",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  customerText: {
    flex: 1,
    color: "#333b37",
    fontSize: 13,
    fontWeight: "700",
  },
  orderTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  orderTypeText: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
    color: "#52605a",
    fontSize: 11,
    fontWeight: "800",
  },
  itemList: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#edf0eb",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "700",
  },
  itemQty: {
    color: "#69756f",
    fontSize: 13,
    fontWeight: "800",
  },
  moreItems: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 12,
  },
  summaryLabel: {
    color: "#69756f",
    fontSize: 11,
    fontWeight: "800",
  },
  paymentText: {
    marginTop: 3,
    color: "#9f2639",
    fontSize: 13,
    fontWeight: "900",
  },
  paymentTextPaid: {
    color: "#2d5a4b",
  },
  totalWrap: {
    alignItems: "flex-end",
  },
  totalText: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  secondaryButtonText: {
    color: "#252525",
    fontSize: 13,
    fontWeight: "900",
  },
  actionButton: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    color: "#69756f",
    textAlign: "center",
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  detailSheet: {
    maxHeight: "86%",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 1,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#f1f4ef",
  },
  detailTitle: {
    paddingRight: 42,
    color: "#1f2522",
    fontSize: 19,
    fontWeight: "900",
  },
  detailCode: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 13,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  detailLabel: {
    color: "#69756f",
    fontSize: 13,
    fontWeight: "800",
  },
  detailValue: {
    flex: 1,
    color: "#1f2522",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "900",
  },
  addressBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  addressTitle: {
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "900",
  },
  addressText: {
    marginTop: 4,
    color: "#52605a",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  detailSectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: "#1f2522",
    fontSize: 14,
    fontWeight: "900",
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  detailItemNameWrap: {
    flex: 1,
  },
  detailItemName: {
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "800",
  },
  detailItemMeta: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "700",
  },
  detailItemTotal: {
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "900",
  },
  detailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
  },
  detailTotalLabel: {
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  detailTotalValue: {
    color: "#1f2522",
    fontSize: 18,
    fontWeight: "900",
  },
  detailActionButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  detailActionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
});
