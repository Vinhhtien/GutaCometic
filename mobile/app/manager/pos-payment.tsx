import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  createPosPayosPaymentLink,
  getOrders,
  payOfflineOrder,
  syncPosPayosPaymentStatus,
} from "@/services/orderService";
import { Order, PaymentLink } from "@/types/order";

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const getCustomerLabel = (order: Order) =>
  order.customerName || order.customerPhone || "Khách lẻ tại quầy";

export default function ManagerPosPaymentScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [isQrVisible, setIsQrVisible] = useState(false);

  const loadOrders = useCallback(
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
          "PENDING_PAYMENT",
          "UNPAID",
          "OFFLINE"
        );
        setOrders(response);
      } catch (error) {
        Alert.alert("Không tải được đơn hàng", getErrorMessage(error));
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
      total: orders.reduce((sum, order) => sum + order.totalPrice, 0),
    }),
    [orders]
  );

  const removeCompletedOrder = (orderId: string) => {
    setOrders((current) => current.filter((order) => order._id !== orderId));
  };

  const handleCashPayment = async (order: Order) => {
    if (!token) {
      return;
    }

    try {
      setProcessingOrderId(order._id);
      await payOfflineOrder(token, order._id, "CASH");
      removeCompletedOrder(order._id);
      Alert.alert("Đã thanh toán", "Đơn tại quầy đã hoàn tất bằng tiền mặt.");
    } catch (error) {
      Alert.alert("Thanh toán thất bại", getErrorMessage(error));
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleOpenQr = async (order: Order) => {
    if (!token) {
      return;
    }

    try {
      setSelectedOrder(order);
      setPaymentLink(null);
      setIsQrVisible(true);
      setProcessingOrderId(order._id);
      const payment = await createPosPayosPaymentLink(token, order._id);
      setPaymentLink(payment);
    } catch (error) {
      setIsQrVisible(false);
      Alert.alert("Không tạo được mã QR", getErrorMessage(error));
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSyncQrPayment = async () => {
    if (!token || !selectedOrder) {
      return;
    }

    try {
      setProcessingOrderId(selectedOrder._id);
      const result = await syncPosPayosPaymentStatus(token, selectedOrder._id);

      if (result.order.paymentStatus === "PAID") {
        removeCompletedOrder(selectedOrder._id);
        setIsQrVisible(false);
        setSelectedOrder(null);
        setPaymentLink(null);
        Alert.alert("Đã nhận thanh toán", "Đơn đã được hoàn tất qua PayOS.");
        return;
      }

      Alert.alert(
        "Chưa nhận được tiền",
        "PayOS chưa xác nhận giao dịch cho đơn này. Vui lòng kiểm tra lại sau."
      );
    } catch (error) {
      Alert.alert("Kiểm tra thanh toán thất bại", getErrorMessage(error));
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>THU NGÂN TẠI QUẦY</Text>
          <Text style={styles.title}>Thanh toán đơn từ Sales</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#252525"
            onRefresh={() => loadOrders("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryPanel}>
          <View>
            <Text style={styles.summaryLabel}>Đơn chờ thanh toán</Text>
            <Text style={styles.summaryValue}>{summary.count}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>Tổng tiền đang chờ</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.total)}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#252525" />
            <Text style={styles.mutedText}>Đang tải đơn từ Sales...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons color="#7c8781" name="receipt-outline" size={30} />
            <Text style={styles.emptyTitle}>Chưa có đơn cần thu tiền</Text>
            <Text style={styles.emptyText}>
              Khi Sales duyệt giỏ hàng offline, đơn sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order._id}
              isProcessing={processingOrderId === order._id}
              onCashPayment={() => handleCashPayment(order)}
              onOpenDetail={() => setDetailOrder(order)}
              onQrPayment={() => handleOpenQr(order)}
              order={order}
            />
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isQrVisible}
        onRequestClose={() => setIsQrVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Thanh toán QR PayOS</Text>
                <Text style={styles.sheetSubtitle}>
                  Quét mã để chuyển khoản cho đơn tại quầy.
                </Text>
              </View>
              <Pressable
                onPress={() => setIsQrVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons color="#252525" name="close" size={22} />
              </Pressable>
            </View>

            <View style={styles.qrFrame}>
              {paymentLink?.qrImage ? (
                <Image
                  resizeMode="contain"
                  source={{ uri: paymentLink.qrImage }}
                  style={styles.qrImage}
                />
              ) : (
                <ActivityIndicator color="#252525" />
              )}
            </View>

            {selectedOrder ? (
              <View style={styles.paymentInfo}>
                <InfoRow
                  label="Mã đơn"
                  value={selectedOrder.orderCode || selectedOrder._id}
                />
                <InfoRow
                  label="Khách hàng"
                  value={getCustomerLabel(selectedOrder)}
                />
                <InfoRow
                  label="Số tiền"
                  value={formatCurrency(selectedOrder.totalPrice)}
                />
              </View>
            ) : null}

            <Pressable
              disabled={!paymentLink || processingOrderId !== null}
              onPress={handleSyncQrPayment}
              style={({ pressed }) => [
                styles.primaryButton,
                (!paymentLink || processingOrderId !== null) &&
                  styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              {processingOrderId ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Kiểm tra đã thanh toán
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </SafeAreaView>
  );
}

function OrderCard({
  isProcessing,
  onCashPayment,
  onOpenDetail,
  onQrPayment,
  order,
}: {
  isProcessing: boolean;
  onCashPayment: () => void;
  onOpenDetail: () => void;
  onQrPayment: () => void;
  order: Order;
}) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderCodeBox}>
          <Ionicons color="#2d5a4b" name="storefront-outline" size={18} />
          <Text style={styles.orderCode}>{order.orderCode || order._id}</Text>
        </View>
        <Text style={styles.orderTotal}>{formatCurrency(order.totalPrice)}</Text>
      </View>

      <Text style={styles.customerName}>{getCustomerLabel(order)}</Text>
      {order.customerPhone ? (
        <Text style={styles.customerPhone}>{order.customerPhone}</Text>
      ) : null}

      <View style={styles.itemList}>
        {order.items.map((item) => (
          <View key={`${order._id}-${item.productId}`} style={styles.itemRow}>
            <Text numberOfLines={1} style={styles.itemName}>
              {item.name}
            </Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpenDetail}
          style={({ pressed }) => [
            styles.detailButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color="#252525" name="eye-outline" size={18} />
        </Pressable>
        <Pressable
          disabled={isProcessing}
          onPress={onCashPayment}
          style={({ pressed }) => [
            styles.secondaryButton,
            isProcessing && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color="#252525" name="cash-outline" size={18} />
          <Text style={styles.secondaryButtonText}>Tiền mặt</Text>
        </Pressable>
        <Pressable
          disabled={isProcessing}
          onPress={onQrPayment}
          style={({ pressed }) => [
            styles.darkButton,
            isProcessing && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color="#ffffff" name="qr-code-outline" size={18} />
          <Text style={styles.darkButtonText}>QR ngân hàng</Text>
        </Pressable>
      </View>
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
  return (
    <Modal
      animationType="slide"
      transparent
      visible={Boolean(order)}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.detailSheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Chi tiết đơn từ Sales</Text>
              <Text style={styles.sheetSubtitle}>
                Kiểm tra sản phẩm trước khi thu tiền.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#252525" name="close" size={22} />
            </Pressable>
          </View>

          {order ? (
            <>
              <View style={styles.paymentInfo}>
                <InfoRow label="Mã đơn" value={order.orderCode || order._id} />
                <InfoRow label="Khách hàng" value={getCustomerLabel(order)} />
                <InfoRow label="Số điện thoại" value={order.customerPhone || "-"} />
                <InfoRow label="Tổng tiền" value={formatCurrency(order.totalPrice)} />
              </View>

              <View style={styles.detailItemList}>
                {order.items.map((item) => (
                  <View
                    key={`${order._id}-${item.productId}`}
                    style={styles.detailItemRow}
                  >
                    <View style={styles.detailItemInfo}>
                      <Text numberOfLines={2} style={styles.detailItemName}>
                        {item.name}
                      </Text>
                      <Text style={styles.detailItemMeta}>
                        {formatCurrency(item.unitPrice)} x{item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.detailItemTotal}>
                      {formatCurrency(item.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>
        {value}
      </Text>
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
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#60716a",
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 24,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  summaryPanel: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  summaryLabel: {
    color: "#c9d4ce",
    fontSize: 12,
    fontWeight: "800",
  },
  summaryValue: {
    marginTop: 5,
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#3a423e",
  },
  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: {
    color: "#6f7a74",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyTitle: {
    color: "#1f2522",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#6f7a74",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "600",
  },
  orderCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  orderCodeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  orderCode: {
    flex: 1,
    color: "#2d5a4b",
    fontSize: 13,
    fontWeight: "900",
  },
  orderTotal: {
    color: "#1f2522",
    fontSize: 18,
    fontWeight: "900",
  },
  customerName: {
    marginTop: 12,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  customerPhone: {
    marginTop: 3,
    color: "#6f7a74",
    fontSize: 13,
    fontWeight: "700",
  },
  itemList: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: {
    flex: 1,
    color: "#303834",
    fontSize: 13,
    fontWeight: "700",
  },
  itemQty: {
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  detailButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  secondaryButtonText: {
    color: "#252525",
    fontSize: 13,
    fontWeight: "900",
  },
  darkButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  darkButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
  },
  disabledButton: {
    opacity: 0.58,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  qrSheet: {
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  detailSheet: {
    maxHeight: "84%",
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  sheetTitle: {
    color: "#1f2522",
    fontSize: 19,
    fontWeight: "900",
  },
  sheetSubtitle: {
    marginTop: 4,
    color: "#6f7a74",
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#f1f4ef",
  },
  qrFrame: {
    width: 210,
    height: 210,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  qrImage: {
    width: 194,
    height: 194,
  },
  paymentInfo: {
    marginTop: 18,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f7f8f5",
  },
  infoRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ece5",
  },
  infoLabel: {
    color: "#6f7a74",
    fontSize: 13,
    fontWeight: "800",
  },
  infoValue: {
    flex: 1,
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  detailItemList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "900",
  },
  detailItemMeta: {
    marginTop: 4,
    color: "#6f7a74",
    fontSize: 12,
    fontWeight: "700",
  },
  detailItemTotal: {
    color: "#2d5a4b",
    fontSize: 13,
    fontWeight: "900",
  },
});
