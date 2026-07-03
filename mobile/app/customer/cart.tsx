import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "@/types/cart";

const MAX_QUANTITY = 50;

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function CartScreen() {
  const { items, removeItem, setQuantity, subtotal } = useCart();

  const hasInvalidQuantity = items.some(
    (item) =>
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
  );

  const requestRemoveItem = (productId: string, onCancel?: () => void) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa sản phẩm này ra khỏi giỏ hàng không?",
      [
        { text: "Hủy bỏ", style: "cancel", onPress: onCancel },
        {
          text: "Xác nhận xóa",
          style: "destructive",
          onPress: () => removeItem(productId),
        },
      ]
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
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <View style={styles.backButton} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons color="#9b9d99" name="bag-handle-outline" size={28} />
          </View>
          <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
          <Text style={styles.emptyMessage}>
            Hãy chọn thêm sản phẩm bạn yêu thích nhé.
          </Text>
          <Pressable
            onPress={() => router.push("/customer/(tabs)/category")}
            style={styles.shopButton}
          >
            <Text style={styles.shopButtonText}>Khám phá sản phẩm</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <CartLineItem
                item={item}
                key={item.productId}
                onQuantityChange={(quantity) =>
                  setQuantity(item.productId, quantity)
                }
                onRequestRemove={(onCancel) =>
                  requestRemoveItem(item.productId, onCancel)
                }
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Tổng cộng</Text>
              <Text style={styles.subtotalValue}>{formatPrice(subtotal)}</Text>
            </View>
            <Pressable
              disabled={hasInvalidQuantity}
              onPress={() => {
                if (hasInvalidQuantity) {
                  Alert.alert(
                    "Thông báo",
                    "Số lượng mua tối đa cho mỗi sản phẩm là 50. Vui lòng kiểm tra lại giỏ hàng."
                  );
                  return;
                }
                router.push("/customer/checkout");
              }}
              style={[
                styles.checkoutButton,
                hasInvalidQuantity && styles.checkoutButtonDisabled,
              ]}
            >
              <Text style={styles.checkoutButtonText}>Tiến hành thanh toán</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function CartLineItem({
  item,
  onQuantityChange,
  onRequestRemove,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRequestRemove: (onCancel?: () => void) => void;
}) {
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  const hasPromptedRemoveRef = useRef(false);

  useEffect(() => {
    setQuantityText(String(item.quantity));
    hasPromptedRemoveRef.current = false;
  }, [item.quantity]);

  const confirmRemove = () => {
    if (hasPromptedRemoveRef.current) {
      return;
    }

    hasPromptedRemoveRef.current = true;
    onRequestRemove(() => {
      hasPromptedRemoveRef.current = false;
      setQuantityText("1");
    });
  };

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      confirmRemove();
      return;
    }

    onQuantityChange(item.quantity - 1);
  };

  const handleIncrease = () => {
    if (item.quantity >= MAX_QUANTITY) {
      Alert.alert("Thông báo", "Số lượng mua tối đa cho mỗi sản phẩm là 50");
      return;
    }

    onQuantityChange(item.quantity + 1);
  };

  const handleChangeText = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    const parsed = parseInt(digitsOnly, 10);

    if (digitsOnly === "" || parsed === 0) {
      setQuantityText(digitsOnly);
      confirmRemove();
      return;
    }

    if (!Number.isNaN(parsed) && parsed > MAX_QUANTITY) {
      Alert.alert("Thông báo", "Số lượng mua tối đa cho mỗi sản phẩm là 50");
      setQuantityText(String(MAX_QUANTITY));
      onQuantityChange(MAX_QUANTITY);
      return;
    }

    setQuantityText(digitsOnly);

    if (!Number.isNaN(parsed)) {
      onQuantityChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(quantityText, 10);

    if (quantityText === "" || Number.isNaN(parsed) || parsed < 1) {
      setQuantityText("1");

      if (item.quantity !== 1) {
        onQuantityChange(1);
      }
      return;
    }

    if (parsed > MAX_QUANTITY) {
      setQuantityText(String(MAX_QUANTITY));

      if (item.quantity !== MAX_QUANTITY) {
        onQuantityChange(MAX_QUANTITY);
      }
    }
  };

  return (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons color="#c33e53" name="leaf-outline" size={22} />
        </View>
      )}

      <View style={styles.cardDetails}>
        <Text numberOfLines={2} style={styles.itemName}>
          {item.name}
        </Text>
        <Text style={styles.itemPrice}>{formatPrice(item.unitPrice)}</Text>

        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Số lượng</Text>
          <View style={styles.quantityStepper}>
            <Pressable
              accessibilityLabel="Giảm số lượng"
              hitSlop={8}
              onPress={handleDecrease}
              style={styles.quantityStepButton}
            >
              <Ionicons color="#252525" name="remove" size={14} />
            </Pressable>
            <TextInput
              keyboardType="numeric"
              onBlur={handleBlur}
              onChangeText={handleChangeText}
              style={styles.quantityInput}
              value={quantityText}
            />
            <Pressable
              accessibilityLabel="Tăng số lượng"
              hitSlop={8}
              onPress={handleIncrease}
              style={styles.quantityStepButton}
            >
              <Ionicons color="#252525" name="add" size={14} />
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Xoá sản phẩm"
        onPress={() => onRequestRemove()}
        style={styles.removeButton}
      >
        <Ionicons color="#9a9c98" name="trash-outline" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
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
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#f1f2ef",
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
  shopButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  shopButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(37, 37, 37, 0.06)",
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#fff0f2",
  },
  cardDetails: {
    flex: 1,
  },
  itemName: {
    color: "#212121",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  itemPrice: {
    marginTop: 4,
    color: "#252525",
    fontSize: 14,
    fontWeight: "800",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  quantityLabel: {
    color: "#8c8e8a",
    fontSize: 12,
    fontWeight: "600",
  },
  quantityStepper: {
    flexDirection: "row",
    alignItems: "center",
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
  quantityInput: {
    minWidth: 36,
    height: 28,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#dedfdb",
    paddingVertical: 0,
    color: "#212121",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderColor: "#f0f1ee",
    backgroundColor: "#ffffff",
  },
  subtotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subtotalLabel: {
    color: "#6f716e",
    fontSize: 14,
    fontWeight: "700",
  },
  subtotalValue: {
    color: "#212121",
    fontSize: 20,
    fontWeight: "900",
  },
  checkoutButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  checkoutButtonDisabled: {
    backgroundColor: "#b7b8b5",
  },
  checkoutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
