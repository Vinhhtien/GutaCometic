import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { createOnlineOrder } from "@/services/orderService";
import { getStores } from "@/services/storeService";
import { Store } from "@/types/store";

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function CheckoutScreen() {
  const { token, user } = useAuth();
  const { clearCart, items, subtotal } = useCart();

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [recipientName, setRecipientName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [addressLine, setAddressLine] = useState(user?.address ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

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

  const handleSubmit = async () => {
    if (!token || isSubmitting) {
      return;
    }

    if (!recipientName.trim() || !phone.trim() || !addressLine.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin nhận hàng.");
      return;
    }

    if (!selectedStoreId) {
      Alert.alert("Chưa chọn cửa hàng", "Vui lòng chọn cửa hàng giao hàng.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createOnlineOrder(token, {
        storeId: selectedStoreId,
        fulfillmentType: "DELIVERY",
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
        },
        paymentMethod: "COD",
      });
      await clearCart();
      setIsSuccessVisible(true);
    } catch (requestError) {
      Alert.alert("Đặt hàng thất bại", getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
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
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.backButton} />
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

          <Text style={styles.sectionLabel}>CỬA HÀNG GIAO HÀNG</Text>
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

          <Text style={styles.sectionLabel}>PHƯƠNG THỨC THANH TOÁN</Text>
          <View style={styles.card}>
            <View style={styles.paymentRow}>
              <Ionicons color="#2d5a4b" name="cash-outline" size={20} />
              <Text style={styles.paymentText}>
                Thanh toán khi nhận hàng (COD)
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>ĐƠN HÀNG</Text>
          <View style={styles.card}>
            {items.map((item) => (
              <View key={item.productId} style={styles.orderItemRow}>
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
              <Text style={styles.subtotalLabel}>Tổng cộng</Text>
              <Text style={styles.subtotalValue}>{formatPrice(subtotal)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Đặt hàng · {formatPrice(subtotal)}
            </Text>
          )}
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={isSuccessVisible}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons color="#2d5a4b" name="checkmark-circle" size={42} />
            <Text style={styles.successTitle}>Đặt hàng thành công</Text>
            <Text style={styles.successMessage}>
              Đơn hàng của bạn đã được ghi nhận và sẽ được xử lý sớm nhất.
            </Text>
            <Pressable
              onPress={() => {
                setIsSuccessVisible(false);
                router.replace("/customer/(tabs)/orders");
              }}
              style={styles.successButton}
            >
              <Text style={styles.successButtonText}>Xem đơn hàng</Text>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
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
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  paymentText: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "700",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
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
  successOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  successCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: "#ffffff",
  },
  successTitle: {
    marginTop: 12,
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
  },
  successMessage: {
    marginTop: 8,
    marginBottom: 20,
    color: "#5c5e5b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  successButton: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2d5a4b",
  },
  successButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
