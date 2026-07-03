import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import {
  getOrderById,
  getPayosPaymentLink,
  syncPayosPaymentStatus,
} from "@/services/orderService";
import { Order, PaymentLink } from "@/types/order";

type PayosQrState = {
  order: Order;
  payment: PaymentLink;
};

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
  const [payosQr, setPayosQr] = useState<PayosQrState | null>(null);
  const [isOpeningPayment, setIsOpeningPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

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
  const isPaid = order?.paymentStatus === "PAID";
  const canPayBankTransfer =
    order?.paymentMethod === "BANK_TRANSFER" && order.paymentStatus !== "PAID";
  const paymentStatusText = order
    ? isPaid
      ? "Đã thanh toán"
      : order.paymentMethod === "COD"
        ? "Chưa thanh toán (Thanh toán COD khi nhận hàng)"
        : (PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus)
    : "";

  const handleOpenPayosQr = async () => {
    if (!token || !order || isOpeningPayment) {
      return;
    }

    try {
      setIsOpeningPayment(true);
      const payment = await getPayosPaymentLink(token, order._id);

      // console.log("[PayOS][Mobile] reopen payment link", {
      //   orderId: order._id,
      //   hasQrImage: Boolean(payment?.qrImage),
      //   qrImageLength: payment?.qrImage?.length || 0,
      //   hasQrCode: Boolean(payment?.qrCode),
      //   expiredAt: payment?.expiredAt,
      // });

      if (payment?.checkoutUrl) {
        setPayosQr({ order, payment });
      }
    } catch (requestError) {
      Alert.alert("Mo thanh toan that bai", getErrorMessage(requestError));
    } finally {
      setIsOpeningPayment(false);
    }
  };

  const handleCheckPayosPayment = async () => {
    if (!token || !payosQr || isCheckingPayment) {
      return;
    }

    try {
      setIsCheckingPayment(true);
      const result = await syncPayosPaymentStatus(token, payosQr.order._id);
      // console.log("[PayOS][Mobile] order detail sync result", {
      //   orderId: payosQr.order._id,
      //   payosStatus: result.payosStatus,
      //   paymentStatus: result.order.paymentStatus,
      // });

      setOrder(result.order);

      if (result.order.paymentStatus === "PAID") {
        setPayosQr(null);
        return;
      }

      Alert.alert(
        "Chua nhan duoc thanh toan",
        `He thong chua ghi nhan giao dich. Trang thai PayOS: ${result.payosStatus}.`
      );
    } catch (requestError) {
      Alert.alert("Kiem tra thanh toan that bai", getErrorMessage(requestError));
    } finally {
      setIsCheckingPayment(false);
    }
  };

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
            <Text
              style={[
                styles.infoLine,
                isPaid ? styles.paymentStatusPaid : styles.paymentStatusUnpaid,
              ]}
            >
              {paymentStatusText}
            </Text>
            {canPayBankTransfer ? (
              <Pressable
                disabled={isOpeningPayment}
                onPress={handleOpenPayosQr}
                style={styles.payButton}
              >
                {isOpeningPayment ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.payButtonText}>
                    Thanh toan chuyen khoan
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setPayosQr(null)}
        transparent
        visible={Boolean(payosQr)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModal}>
            <Pressable
              accessibilityLabel="Dong thanh toan"
              onPress={() => setPayosQr(null)}
              style={styles.qrCloseButton}
            >
              <Ionicons color="#252525" name="close" size={20} />
            </Pressable>

            <Text style={styles.qrTitle}>Chuyen khoan ngan hang</Text>
            <Text style={styles.qrSubtitle}>
              Quet ma QR bang ung dung ngan hang de thanh toan.
            </Text>

            <View style={styles.qrBox}>
              {payosQr?.payment.qrImage ? (
                <Image
                  resizeMode="contain"
                  source={{ uri: payosQr.payment.qrImage }}
                  style={styles.qrImage}
                />
              ) : (
                <ActivityIndicator color="#252525" />
              )}
            </View>

            <Pressable
              disabled={isCheckingPayment}
              onPress={handleCheckPayosPayment}
              style={[
                styles.payButton,
                isCheckingPayment && styles.payButtonDisabled,
              ]}
            >
              {isCheckingPayment ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.payButtonText}>Toi da thanh toan</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  paymentStatusPaid: {
    color: "#1f9254",
  },
  paymentStatusUnpaid: {
    color: "#c2660a",
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
  payButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  qrModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  qrModal: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#ffffff",
  },
  qrCloseButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 1,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#f0f1ee",
  },
  qrTitle: {
    paddingRight: 44,
    color: "#212121",
    fontSize: 18,
    fontWeight: "900",
  },
  qrSubtitle: {
    marginTop: 6,
    paddingRight: 28,
    color: "#747673",
    fontSize: 13,
    lineHeight: 19,
  },
  qrBox: {
    alignSelf: "center",
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef0ec",
    borderRadius: 18,
    backgroundColor: "#ffffff",
  },
  qrImage: {
    width: 220,
    height: 220,
  },
});
