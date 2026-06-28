import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "@/types/cart";

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function CartScreen() {
  const { items, removeItem, setQuantity, subtotal } = useCart();

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
                key={item.productId}
                item={item}
                onDecrease={() => setQuantity(item.productId, item.quantity - 1)}
                onIncrease={() => setQuantity(item.productId, item.quantity + 1)}
                onRemove={() => removeItem(item.productId)}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Tổng cộng</Text>
              <Text style={styles.subtotalValue}>{formatPrice(subtotal)}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/customer/checkout")}
              style={styles.checkoutButton}
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
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
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
          <Pressable onPress={onDecrease} style={styles.quantityButton}>
            <Ionicons color="#252525" name="remove" size={16} />
          </Pressable>
          <Text style={styles.quantityValue}>{item.quantity}</Text>
          <Pressable onPress={onIncrease} style={styles.quantityButton}>
            <Ionicons color="#252525" name="add" size={16} />
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Xoá sản phẩm"
        onPress={onRemove}
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
    gap: 12,
    marginTop: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 14,
  },
  quantityValue: {
    minWidth: 18,
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
  checkoutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
