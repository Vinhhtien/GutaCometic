import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getErrorMessage } from "@/services/api";
import {
  createOnlineOrder,
  syncPayosPaymentStatus,
} from "@/services/orderService";
import { getStores } from "@/services/storeService";
import { Order, PaymentLink, PaymentMethod } from "@/types/order";
import { Store } from "@/types/store";

const DELIVERY_FEE = 25000;

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

type FulfillmentType = "DELIVERY" | "STORE_PICKUP";
type CheckoutStep = 1 | 2;

type PayosQrState = {
  order: Order;
  payment: PaymentLink;
};

const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "COD", label: "Thanh toán khi nhận hàng (COD)", icon: "cash-outline" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản ngân hàng", icon: "card-outline" },
];

export default function CheckoutScreen() {
  const { token, user } = useAuth();
  const { clearCart, items, removeItem, setQuantity, subtotal } = useCart();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);

  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("DELIVERY");

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [recipientName, setRecipientName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [addressLine, setAddressLine] = useState(user?.address ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payosQr, setPayosQr] = useState<PayosQrState | null>(null);
  const [pendingPayosOrder, setPendingPayosOrder] =
    useState<PayosQrState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const isDelivery = fulfillmentType === "DELIVERY";
  const shippingFee = isDelivery ? DELIVERY_FEE : 0;
  const totalPrice = subtotal + shippingFee;

  const selectedStore = useMemo(
    () => stores.find((store) => store._id === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  );

  const loadStores = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setStoresError("");
      const response = await getStores(token);
      setStores(response);
      setSelectedStoreId((current) => current || response[0]?._id || "");
    } catch (requestError) {
      setStoresError(getErrorMessage(requestError));
    } finally {
      setIsLoadingStores(false);
    }
  }, [token]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    if (!payosQr?.payment.expiredAt) {
      setRemainingSeconds(0);
      return;
    }

    const expiresAt = new Date(payosQr.payment.expiredAt).getTime();

    const updateRemaining = () => {
      setRemainingSeconds(
        Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      );
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);

    return () => clearInterval(timer);
  }, [payosQr]);

  const formattedRemainingTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingSeconds]);

  const handleDecreaseQuantity = (item: (typeof items)[number]) => {
    if (item.quantity <= 1) {
      Alert.alert(
        "Xác nhận xóa",
        "Bạn có chắc chắn muốn xóa sản phẩm này ra khỏi giỏ hàng không?",
        [
          { text: "Hủy bỏ", style: "cancel" },
          {
            text: "Xác nhận xóa",
            style: "destructive",
            onPress: () => removeItem(item.productId),
          },
        ]
      );
      return;
    }

    setQuantity(item.productId, item.quantity - 1);
  };

  const handleIncreaseQuantity = (item: (typeof items)[number]) => {
    setQuantity(item.productId, item.quantity + 1);
  };

  const handleContinueToPayment = () => {
    if (
      isDelivery &&
      (!recipientName.trim() || !phone.trim() || !addressLine.trim())
    ) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin nhận hàng.");
      return;
    }

    if (!selectedStoreId) {
      Alert.alert(
        "Chưa chọn cửa hàng",
        isDelivery
          ? "Vui lòng chọn cửa hàng giao hàng."
          : "Vui lòng chọn cửa hàng để nhận hàng."
      );
      return;
    }

    setCurrentStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!token || isSubmitting) {
      return;
    }

    if (pendingPayosOrder) {
      setPayosQr(pendingPayosOrder);
      return;
    }

    const effectivePaymentMethod: PaymentMethod = paymentMethod;

    try {
      setIsSubmitting(true);
      const { order, payment } = await createOnlineOrder(token, {
        storeId: selectedStoreId,
        fulfillmentType,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: isDelivery
          ? {
              recipientName: recipientName.trim(),
              phone: phone.trim(),
              addressLine: addressLine.trim(),
            }
          : null,
        shippingFee,
        paymentMethod: effectivePaymentMethod,
      });

      if (payment?.checkoutUrl) {
        // console.log("[PayOS][Mobile] payment link received", {
        //   orderId: order._id,
        //   hasQrImage: Boolean(payment.qrImage),
        //   qrImageLength: payment.qrImage?.length || 0,
        //   hasQrCode: Boolean(payment.qrCode),
        //   expiredAt: payment.expiredAt,
        // });
        const nextPayosQr = { order, payment };
        setPendingPayosOrder(nextPayosQr);
        setPayosQr(nextPayosQr);
        return;
      }

      const successMessage =
        effectivePaymentMethod === "BANK_TRANSFER"
          ? "Bạn đã thanh toán thành công!"
          : "Bạn đã đặt hàng thành công!";

      Alert.alert(successMessage, undefined, [
        {
          text: "OK",
          onPress: async () => {
            await clearCart();
            router.replace({
              pathname: "/customer/order-detail",
              params: { id: order._id },
            });
          },
        },
      ]);
    } catch (requestError) {
      Alert.alert("Đặt hàng thất bại", getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPayosPayment = async () => {
    if (!token || !payosQr || isCheckingPayment) {
      return;
    }

    try {
      setIsCheckingPayment(true);
      const result = await syncPayosPaymentStatus(token, payosQr.order._id);
      // console.log("[PayOS][Mobile] sync result", {
      //   orderId: payosQr.order._id,
      //   payosStatus: result.payosStatus,
      //   paymentStatus: result.order.paymentStatus,
      // });

      if (result.order.paymentStatus === "PAID") {
        const orderId = result.order._id;
        await clearCart();
        setPendingPayosOrder(null);
        setPayosQr(null);
        router.replace({
          pathname: "/customer/order-detail",
          params: { id: orderId },
        });
        return;
      }

      Alert.alert(
        "Chưa nhận được thanh toán",
        `Hệ thống chưa ghi nhận giao dịch. Trạng thái PayOS: ${result.payosStatus}. Vui lòng đợi một chút rồi thử lại.`
      );
    } catch (requestError) {
      Alert.alert("Kiểm tra thanh toán thất bại", getErrorMessage(requestError));
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (items.length === 0 && !payosQr && !pendingPayosOrder) {
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
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons color="#9b9d99" name="bag-handle-outline" size={28} />
          <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
          <Text style={styles.emptyMessage}>
            Hãy thêm sản phẩm vào giỏ trước khi thanh toán.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() =>
            currentStep === 2 ? setCurrentStep(1) : router.back()
          }
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= 1 && styles.progressDotActive,
              ]}
            >
              <Text
                style={[
                  styles.progressDotText,
                  currentStep >= 1 && styles.progressDotTextActive,
                ]}
              >
                1
              </Text>
            </View>
            <Text
              style={[
                styles.progressLabel,
                currentStep === 1 && styles.progressLabelActive,
              ]}
            >
              Nhận hàng
            </Text>
          </View>

          <View
            style={[
              styles.progressLine,
              currentStep === 2 && styles.progressLineActive,
            ]}
          />

          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= 2 && styles.progressDotActive,
              ]}
            >
              <Text
                style={[
                  styles.progressDotText,
                  currentStep >= 2 && styles.progressDotTextActive,
                ]}
              >
                2
              </Text>
            </View>
            <Text
              style={[
                styles.progressLabel,
                currentStep === 2 && styles.progressLabelActive,
              ]}
            >
              Thanh toán
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 ? (
            <>
              <View style={styles.methodSwitcher}>
                <Pressable
                  onPress={() => setFulfillmentType("DELIVERY")}
                  style={[styles.methodTab, isDelivery && styles.methodTabActive]}
                >
                  <Ionicons
                    color={isDelivery ? "#ffffff" : "#6f716e"}
                    name="car-outline"
                    size={18}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      isDelivery && styles.methodTabTextActive,
                    ]}
                  >
                    Giao hàng tận nơi
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFulfillmentType("STORE_PICKUP")}
                  style={[styles.methodTab, !isDelivery && styles.methodTabActive]}
                >
                  <Ionicons
                    color={!isDelivery ? "#ffffff" : "#6f716e"}
                    name="storefront-outline"
                    size={18}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      !isDelivery && styles.methodTabTextActive,
                    ]}
                  >
                    Nhận tại cửa hàng
                  </Text>
                </Pressable>
              </View>

              {(
                <>
                  <Text style={styles.sectionLabel}>ĐỊA CHỈ NHẬN HÀNG</Text>
                  <View style={styles.card}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>HỌ VÀ TÊN</Text>
                      <TextInput
                        onChangeText={setRecipientName}
                        style={styles.fieldValueInput}
                        value={recipientName}
                      />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>SỐ ĐIỆN THOẠI</Text>
                      <TextInput
                        keyboardType="phone-pad"
                        onChangeText={setPhone}
                        style={styles.fieldValueInput}
                        value={phone}
                      />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>ĐỊA CHỈ GIAO HÀNG</Text>
                      <TextInput
                        multiline
                        onChangeText={setAddressLine}
                        style={styles.fieldValueInput}
                        value={addressLine}
                      />
                    </View>
                  </View>
                </>
              )}

              <Text style={styles.sectionLabel}>
                {isDelivery ? "CỬA HÀNG GIAO HÀNG" : "HỆ THỐNG CỬA HÀNG GUTA"}
              </Text>
              <View style={styles.card}>
                {isLoadingStores ? (
                  <ActivityIndicator color="#252525" style={styles.storeLoader} />
                ) : storesError ? (
                  <Text style={styles.storeErrorText}>{storesError}</Text>
                ) : stores.length === 0 ? (
                  <Text style={styles.storeErrorText}>
                    Hiện chưa có cửa hàng nào khả dụng.
                  </Text>
                ) : (
                  stores.map((store) => {
                    const isSelected = store._id === selectedStoreId;

                    return (
                      <Pressable
                        key={store._id}
                        onPress={() => setSelectedStoreId(store._id)}
                        style={styles.storeRow}
                      >
                        <View
                          style={[
                            styles.radioOuter,
                            isSelected && styles.radioOuterActive,
                          ]}
                        >
                          {isSelected ? <View style={styles.radioInner} /> : null}
                        </View>
                        <View style={styles.storeTextWrap}>
                          <Text style={styles.storeName}>{store.name}</Text>
                          <Text style={styles.storeAddress}>{store.address}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>THÔNG TIN NHẬN HÀNG</Text>
              <View style={styles.card}>
                <View style={styles.summaryRow}>
                  <Ionicons
                    color="#2d5a4b"
                    name={isDelivery ? "car-outline" : "storefront-outline"}
                    size={18}
                  />
                  <View style={styles.summaryTextWrap}>
                    <Text style={styles.summaryTitle}>
                      {isDelivery ? "Giao hàng tận nơi" : "Nhận tại cửa hàng"}
                    </Text>
                    {isDelivery ? (
                      <>
                        <Text style={styles.summaryLine}>
                          {recipientName.trim()} · {phone.trim()}
                        </Text>
                        <Text style={styles.summaryLineMuted}>
                          {addressLine.trim()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.summaryLine}>
                          {selectedStore?.name}
                        </Text>
                        <Text style={styles.summaryLineMuted}>
                          {selectedStore?.address}
                        </Text>
                      </>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setCurrentStep(1)}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>Sửa</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.sectionLabel}>SẢN PHẨM ({items.length})</Text>
              <View style={styles.card}>
                {items.map((item, index) => (
                  <View key={item.productId}>
                    <View style={styles.productRow}>
                      <Image
                        source={{ uri: item.image }}
                        style={styles.productThumbnail}
                      />
                      <View style={styles.productInfo}>
                        <Text style={styles.productBrand}>{item.brand}</Text>
                        <Text numberOfLines={2} style={styles.productName}>
                          {item.name}
                        </Text>
                        <Text style={styles.productPrice}>
                          {formatPrice(item.unitPrice)}
                        </Text>
                        <View style={styles.quantityStepper}>
                          <Pressable
                            accessibilityLabel="Giảm số lượng"
                            hitSlop={8}
                            onPress={() => handleDecreaseQuantity(item)}
                            style={styles.quantityStepButton}
                          >
                            <Ionicons color="#252525" name="remove" size={14} />
                          </Pressable>
                          <Text style={styles.quantityValue}>
                            {item.quantity}
                          </Text>
                          <Pressable
                            accessibilityLabel="Tăng số lượng"
                            hitSlop={8}
                            onPress={() => handleIncreaseQuantity(item)}
                            style={styles.quantityStepButton}
                          >
                            <Ionicons color="#252525" name="add" size={14} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    {index < items.length - 1 ? (
                      <View style={styles.divider} />
                    ) : null}
                  </View>
                ))}
              </View>

              {isDelivery ? (
                <>
                  <Text style={styles.sectionLabel}>
                    PHƯƠNG THỨC THANH TOÁN
                  </Text>
                  <View style={styles.card}>
                    {PAYMENT_METHOD_OPTIONS.map((option, index) => {
                      const isSelected = paymentMethod === option.value;

                      return (
                        <View key={option.value}>
                          <Pressable
                            onPress={() => setPaymentMethod(option.value)}
                            style={styles.paymentOptionRow}
                          >
                            <View
                              style={[
                                styles.radioOuter,
                                isSelected && styles.radioOuterActive,
                              ]}
                            >
                              {isSelected ? (
                                <View style={styles.radioInner} />
                              ) : null}
                            </View>
                            <View style={styles.paymentOptionIcon}>
                              <Ionicons
                                color={isSelected ? "#2d5a4b" : "#6f716e"}
                                name={option.icon}
                                size={18}
                              />
                            </View>
                            <Text
                              style={[
                                styles.paymentOptionLabel,
                                isSelected && styles.paymentOptionLabelActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                          {index < PAYMENT_METHOD_OPTIONS.length - 1 ? (
                            <View style={styles.divider} />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.sectionLabel}>CHI TIẾT THANH TOÁN</Text>
              <View style={styles.card}>
                <View style={styles.orderItemRow}>
                  <Text style={styles.summaryLabel}>Tổng tiền hàng</Text>
                  <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                </View>
                <View style={styles.orderItemRow}>
                  <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                  <Text style={styles.summaryValue}>
                    {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.orderItemRow}>
                  <Text style={styles.subtotalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.subtotalValue}>
                    {formatPrice(totalPrice)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {currentStep === 1 ? (
          <Pressable onPress={handleContinueToPayment} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Tiếp tục đến thanh toán</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={isSubmitting}
            onPress={handlePlaceOrder}
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {pendingPayosOrder
                  ? `Mở lại mã QR thanh toán · ${formatPrice(
                      pendingPayosOrder.order.totalPrice
                    )}`
                  : `Tiến hành đặt hàng · ${formatPrice(totalPrice)}`}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setPayosQr(null)}
        transparent
        visible={Boolean(payosQr)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModal}>
            <Pressable
              accessibilityLabel="Đóng thanh toán"
              onPress={() => setPayosQr(null)}
              style={styles.qrCloseButton}
            >
              <Ionicons color="#252525" name="close" size={20} />
            </Pressable>

            <Text style={styles.qrTitle}>Chuyển khoản ngân hàng</Text>
            <Text style={styles.qrSubtitle}>
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán.
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

            <View style={styles.qrInfoBox}>
              <View style={styles.qrInfoRow}>
                <Text style={styles.qrInfoLabel}>Số tiền</Text>
                <Text style={styles.qrInfoValue}>
                  {formatPrice(payosQr?.order.totalPrice || 0)}
                </Text>
              </View>
              <View style={styles.qrInfoRow}>
                <Text style={styles.qrInfoLabel}>Mã đơn</Text>
                <Text style={styles.qrInfoValue}>
                  {payosQr?.order.orderCode}
                </Text>
              </View>
              <View style={styles.qrInfoRow}>
                <Text style={styles.qrInfoLabel}>Còn lại</Text>
                <Text style={styles.qrInfoValue}>
                  {formattedRemainingTime}
                </Text>
              </View>
            </View>

            <Pressable
              disabled={isCheckingPayment}
              onPress={handleCheckPayosPayment}
              style={[
                styles.qrDoneButton,
                isCheckingPayment && styles.submitButtonDisabled,
              ]}
            >
              {isCheckingPayment ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.qrDoneButtonText}>Tôi đã thanh toán</Text>
              )}
            </Pressable>

            <Pressable
              onPress={async () => {
                const orderId = payosQr?.order._id;
                await clearCart();
                setPendingPayosOrder(null);
                setPayosQr(null);

                if (orderId) {
                  router.replace({
                    pathname: "/customer/order-detail",
                    params: { id: orderId },
                  });
                }
              }}
              style={styles.qrDoneButton}
            >
              <Text style={styles.qrDoneButtonText}>Xem đơn hàng</Text>
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    marginTop: 14,
    color: "#2d2e2c",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyMessage: {
    maxWidth: 280,
    marginTop: 7,
    color: "#747673",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  progressWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: "#ffffff",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStep: {
    alignItems: "center",
    width: 76,
  },
  progressDot: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#f0f1ee",
  },
  progressDotActive: {
    backgroundColor: "#252525",
  },
  progressDotText: {
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "800",
  },
  progressDotTextActive: {
    color: "#ffffff",
  },
  progressLabel: {
    marginTop: 6,
    color: "#9a9c98",
    fontSize: 11,
    fontWeight: "700",
  },
  progressLabelActive: {
    color: "#252525",
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginTop: 13,
    backgroundColor: "#f0f1ee",
  },
  progressLineActive: {
    backgroundColor: "#252525",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  methodSwitcher: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  methodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f0f1ee",
  },
  methodTabActive: {
    backgroundColor: "#252525",
  },
  methodTabText: {
    color: "#6f716e",
    fontSize: 13,
    fontWeight: "800",
  },
  methodTabTextActive: {
    color: "#ffffff",
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  field: {
    paddingVertical: 14,
  },
  fieldLabel: {
    color: "#9a9c98",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  fieldValueInput: {
    marginTop: 4,
    padding: 0,
    color: "#252525",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f1ee",
  },
  storeLoader: {
    paddingVertical: 16,
  },
  storeErrorText: {
    paddingVertical: 16,
    color: "#9f2639",
    fontSize: 13,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  radioOuter: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#d9dad6",
    borderRadius: 10,
  },
  radioOuterActive: {
    borderColor: "#252525",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#252525",
  },
  storeTextWrap: {
    flex: 1,
  },
  storeName: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
  },
  storeAddress: {
    marginTop: 2,
    color: "#8c8e8a",
    fontSize: 12,
  },
  paymentOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  paymentOptionIcon: {
    width: 26,
    alignItems: "center",
  },
  paymentOptionLabel: {
    flex: 1,
    color: "#3d3e3c",
    fontSize: 13,
    fontWeight: "700",
  },
  paymentOptionLabelActive: {
    color: "#212121",
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 14,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
  },
  summaryLine: {
    marginTop: 4,
    color: "#3d3e3c",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryLineMuted: {
    marginTop: 2,
    color: "#8c8e8a",
    fontSize: 12,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f0f1ee",
  },
  editButtonText: {
    color: "#252525",
    fontSize: 12,
    fontWeight: "800",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
  },
  productThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f0f1ee",
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    color: "#9a9c98",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  productName: {
    marginTop: 2,
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
  },
  productPrice: {
    marginTop: 4,
    color: "#2d5a4b",
    fontSize: 13,
    fontWeight: "700",
  },
  quantityStepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 8,
    overflow: "hidden",
  },
  quantityStepButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f7f6",
  },
  quantityValue: {
    minWidth: 32,
    color: "#212121",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
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
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderColor: "#f0f1ee",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
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
  qrInfoBox: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#f7f8f5",
    overflow: "hidden",
  },
  qrInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eceee9",
  },
  qrInfoLabel: {
    color: "#747673",
    fontSize: 13,
    fontWeight: "700",
  },
  qrInfoValue: {
    flex: 1,
    color: "#212121",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  qrDoneButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  qrDoneButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
});
