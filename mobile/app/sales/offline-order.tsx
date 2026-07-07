import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import {
  approveOfflineOrder,
  createOfflineOrder,
  getOrders,
} from "@/services/orderService";
import { getProducts } from "@/services/productService";
import { Order } from "@/types/order";
import { Product } from "@/types/product";

type SalesSection = "catalog" | "cart" | "pending";
type CartItem = {
  product: Product;
  quantity: number;
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function SalesOfflineOrderScreen() {
  const { section } = useLocalSearchParams<{ section?: SalesSection }>();
  const { token, user } = useAuth();
  const [activeSection, setActiveSection] = useState<SalesSection>(
    section || "catalog"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);

  const loadData = useCallback(
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

        const [nextProducts, nextOrders] = await Promise.all([
          getProducts(token, search ? { search } : {}),
          getOrders(token, "PENDING_APPROVAL", undefined, "OFFLINE"),
        ]);
        setProducts(nextProducts);
        setPendingOrders(nextOrders);
      } catch (error) {
        Alert.alert("Không thể tải dữ liệu", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [search, token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );

  const addToCart = (product: Product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product._id === product._id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });
    setActiveSection("cart");
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    setCartItems((currentItems) =>
      nextQuantity <= 0
        ? currentItems.filter((item) => item.product._id !== productId)
        : currentItems.map((item) =>
            item.product._id === productId
              ? { ...item, quantity: nextQuantity }
              : item
          )
    );
  };

  const handleCreateOrder = async () => {
    if (!token || !user?.storeId || isSubmitting) {
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert("Giỏ hàng trống", "Hãy thêm ít nhất một sản phẩm.");
      return;
    }

    try {
      setIsSubmitting(true);
      const order = await createOfflineOrder(token, {
        storeId: user.storeId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
      });

      setPendingOrders((currentOrders) => [order, ...currentOrders]);
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setActiveSection("pending");
    } catch (error) {
      Alert.alert("Không thể tạo đơn", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOrder = async (order: Order) => {
    if (!token || approvingOrderId) {
      return;
    }

    try {
      setApprovingOrderId(order._id);
      await approveOfflineOrder(token, order._id);
      setPendingOrders((currentOrders) =>
        currentOrders.filter((item) => item._id !== order._id)
      );
      Alert.alert("Đã đẩy sang thu ngân", "Manager có thể thanh toán đơn này.");
    } catch (error) {
      Alert.alert("Không thể duyệt đơn", getErrorMessage(error));
    } finally {
      setApprovingOrderId(null);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={styles.productName}>
          {item.name}
        </Text>
        <Text style={styles.productMeta}>
          {item.brand} · {item.category}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
      </View>
      <Pressable onPress={() => addToCart(item)} style={styles.addButton}>
        <Ionicons color="#ffffff" name="add" size={20} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color="#252525" name="arrow-back" size={21} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SALES WORKFLOW</Text>
          <Text style={styles.title}>Tư vấn tại quầy</Text>
        </View>
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
        </View>
      </View>

      <View style={styles.segmentRow}>
        {[
          { key: "catalog", label: "Sản phẩm" },
          { key: "cart", label: "Giỏ tư vấn" },
          { key: "pending", label: "Chờ duyệt" },
        ].map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveSection(tab.key as SalesSection)}
              style={[styles.segmentButton, isActive && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeSection === "catalog" ? (
        <View style={styles.content}>
          <View style={styles.searchBox}>
            <Ionicons color="#69756f" name="search-outline" size={18} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Tìm sản phẩm, thương hiệu..."
              placeholderTextColor="#8a948f"
              style={styles.searchInput}
              value={search}
            />
          </View>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#252525" />
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={products}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  tintColor="#252525"
                  onRefresh={() => loadData("refresh")}
                />
              }
              renderItem={renderProduct}
            />
          )}
        </View>
      ) : null}

      {activeSection === "cart" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Thông tin khách</Text>
          <TextInput
            onChangeText={setCustomerName}
            placeholder="Tên khách vãng lai"
            placeholderTextColor="#8a948f"
            style={styles.input}
            value={customerName}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setCustomerPhone}
            placeholder="Số điện thoại"
            placeholderTextColor="#8a948f"
            style={styles.input}
            value={customerPhone}
          />

          <Text style={styles.sectionTitle}>Giỏ tư vấn</Text>
          {cartItems.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có sản phẩm trong giỏ.</Text>
          ) : (
            cartItems.map((item) => (
              <View key={item.product._id} style={styles.cartRow}>
                <View style={styles.cartInfo}>
                  <Text numberOfLines={2} style={styles.cartName}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.cartPrice}>
                    {formatPrice(item.product.price)}
                  </Text>
                </View>
                <View style={styles.qtyControl}>
                  <Pressable
                    onPress={() =>
                      updateQuantity(item.product._id, item.quantity - 1)
                    }
                    style={styles.qtyButton}
                  >
                    <Ionicons color="#252525" name="remove" size={16} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    onPress={() =>
                      updateQuantity(item.product._id, item.quantity + 1)
                    }
                    style={styles.qtyButton}
                  >
                    <Ionicons color="#252525" name="add" size={16} />
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tạm tính</Text>
            <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={handleCreateOrder}
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Tạo đơn tư vấn</Text>
            )}
          </Pressable>
        </ScrollView>
      ) : null}

      {activeSection === "pending" ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={pendingOrders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadData("refresh")}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons color="#69756f" name="send-outline" size={34} />
              <Text style={styles.emptyTitle}>Không có đơn chờ duyệt</Text>
              <Text style={styles.emptyText}>
                Đơn tư vấn mới sẽ xuất hiện ở đây trước khi đẩy sang thu ngân.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <Text style={styles.orderCode}>{item.orderCode}</Text>
              <Text style={styles.orderMeta}>
                {item.customerName || "Khách vãng lai"} · {item.items.length} sản
                phẩm
              </Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng tiền</Text>
                <Text style={styles.totalValue}>{formatPrice(item.totalPrice)}</Text>
              </View>
              <Pressable
                disabled={approvingOrderId === item._id}
                onPress={() => handleApproveOrder(item)}
                style={[
                  styles.primaryButton,
                  approvingOrderId === item._id && styles.disabledButton,
                ]}
              >
                {approvingOrderId === item._id ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Đẩy sang thu ngân
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { color: "#1f2522", fontSize: 23, fontWeight: "900" },
  cartBadge: {
    minWidth: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  cartBadgeText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  segmentActive: { backgroundColor: "#252525", borderColor: "#252525" },
  segmentText: { color: "#52605a", fontSize: 12, fontWeight: "900" },
  segmentTextActive: { color: "#ffffff" },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  searchBox: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  searchInput: { flex: 1, color: "#1f2522", fontWeight: "700" },
  listContent: { paddingHorizontal: 18, paddingBottom: 28 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  productImage: { width: 58, height: 58, borderRadius: 8 },
  productInfo: { flex: 1 },
  productName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  productMeta: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 11,
    fontWeight: "700",
  },
  productPrice: {
    marginTop: 5,
    color: "#2d5a4b",
    fontSize: 14,
    fontWeight: "900",
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  input: {
    height: 46,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
    color: "#1f2522",
    fontWeight: "700",
  },
  emptyText: {
    color: "#69756f",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  cartInfo: { flex: 1 },
  cartName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  cartPrice: { marginTop: 4, color: "#69756f", fontWeight: "800" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  qtyText: {
    minWidth: 22,
    color: "#1f2522",
    textAlign: "center",
    fontWeight: "900",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalLabel: { color: "#69756f", fontWeight: "800" },
  totalValue: { color: "#1f2522", fontSize: 18, fontWeight: "900" },
  primaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  orderCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  orderCode: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  orderMeta: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 13,
    fontWeight: "700",
  },
});
