import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
  CustomerLookup,
  searchCustomers,
} from "@/services/customerService";
import {
  createRestockRequest,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
} from "@/services/inventoryService";
import {
  approveOfflineOrder,
  cancelOrder,
  createOfflineOrder,
  getOrders,
} from "@/services/orderService";
import {
  InventoryAlert,
  InventoryRestockRequest,
  ProductInventory,
  ProductStoreInventory,
} from "@/types/inventory";
import { Order } from "@/types/order";
import { Product } from "@/types/product";

type SalesSection = "catalog" | "cart" | "pending" | "inventory" | "history";

type CartItem = {
  availableStock: number;
  product: Product;
  quantity: number;
};

type ProductQuickFilters = {
  brand: string;
  category: string;
  inStockOnly: boolean;
  skinType: string;
};

const defaultProductFilters: ProductQuickFilters = {
  brand: "",
  category: "",
  inStockOnly: false,
  skinType: "",
};

const tabs: { key: SalesSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "catalog", label: "Tra cứu", icon: "search-outline" },
  { key: "cart", label: "Giỏ tạm", icon: "bag-handle-outline" },
  { key: "pending", label: "Gửi thu ngân", icon: "send-outline" },
  { key: "inventory", label: "Tồn kho", icon: "cube-outline" },
  { key: "history", label: "Lịch sử", icon: "time-outline" },
];

const formatPrice = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const getStoreId = (storeId: unknown) =>
  typeof storeId === "object" && storeId && "_id" in storeId
    ? String((storeId as { _id: string })._id)
    : String(storeId || "");

export default function SalesOfflineOrderScreen() {
  const { section } = useLocalSearchParams<{ section?: SalesSection }>();
  const { token, user } = useAuth();
  const [activeSection, setActiveSection] = useState<SalesSection>(
    section || "catalog"
  );
  const [productInventories, setProductInventories] = useState<ProductInventory[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [restockRequests, setRestockRequests] = useState<InventoryRestockRequest[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<ProductInventory | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLookup | null>(null);
  const [customerResults, setCustomerResults] = useState<CustomerLookup[]>([]);
  const [customerLookupError, setCustomerLookupError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productFilters, setProductFilters] = useState<ProductQuickFilters>(
    defaultProductFilters
  );
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [draftActionOrderId, setDraftActionOrderId] = useState<string | null>(
    null
  );
  const [restockSubmittingProductId, setRestockSubmittingProductId] = useState<
    string | null
  >(null);

  const currentStoreId = getStoreId(user?.storeId);

  useEffect(() => {
    if (section) {
      setActiveSection(section);
    }
  }, [section]);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [products, orders, history] = await Promise.all([
          getProductInventory(token, {
            brand: productFilters.brand,
            category: productFilters.category,
            search,
            skinType: productFilters.skinType,
          }),
          getOrders(token, "PENDING_APPROVAL", undefined, "OFFLINE"),
          getOrders(token, undefined, undefined, "OFFLINE"),
        ]);
        const [alerts, requests] = await Promise.all([
          getInventoryAlerts(token).catch(() => []),
          getRestockRequests(token, "OPEN").catch(() => []),
        ]);

        setProductInventories(products);
        setInventoryAlerts(alerts);
        setRestockRequests(requests);
        setPendingOrders(orders);
        setHistoryOrders(history);
      } catch (error) {
        Alert.alert("Không tải được dữ liệu", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      productFilters.brand,
      productFilters.category,
      productFilters.skinType,
      search,
      token,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!token || customerSearch.trim().length < 2 || selectedCustomer) {
      setCustomerResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsCustomerLoading(true);
        setCustomerLookupError("");
        const customers = await searchCustomers(token, customerSearch.trim());
        setCustomerResults(customers);
      } catch (error) {
        setCustomerResults([]);
        setCustomerLookupError(getErrorMessage(error));
      } finally {
        setIsCustomerLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [customerSearch, selectedCustomer, token]);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );

  const currentStoreTotal = useMemo(
    () =>
      productInventories.reduce((sum, item) => {
        const inventory = getCurrentStoreInventory(item);
        return sum + (inventory?.availableStock || 0);
      }, 0),
    [productInventories, currentStoreId]
  );

  const displayedProductInventories = useMemo(
    () =>
      productFilters.inStockOnly
        ? productInventories.filter(
            (item) => (getCurrentStoreInventory(item)?.availableStock || 0) > 0
          )
        : productInventories,
    [productFilters.inStockOnly, productInventories, currentStoreId]
  );

  const quickFilterOptions = useMemo(() => {
    const brands = new Set<string>();
    const categories = new Set<string>();
    const skinTypes = new Set<string>();

    productInventories.forEach(({ product }) => {
      if (product.brand) {
        brands.add(product.brand);
      }

      if (product.category) {
        categories.add(product.category);
      }

      product.skinTypes?.forEach((skinType) => {
        if (skinType) {
          skinTypes.add(skinType);
        }
      });
    });

    return {
      brands: Array.from(brands).slice(0, 12),
      categories: Array.from(categories).slice(0, 12),
      skinTypes: Array.from(skinTypes).slice(0, 12),
    };
  }, [productInventories]);

  const activeProductFilterCount = [
    productFilters.brand,
    productFilters.category,
    productFilters.skinType,
    productFilters.inStockOnly ? "inStock" : "",
  ].filter(Boolean).length;

  const updateProductFilter = (
    key: keyof ProductQuickFilters,
    value: string | boolean
  ) => {
    setProductFilters((current) => ({
      ...current,
      [key]: current[key] === value ? defaultProductFilters[key] : value,
    }));
  };

  const resetProductFilters = () => {
    setProductFilters(defaultProductFilters);
  };

  function getCurrentStoreInventory(item: ProductInventory) {
    return item.inventories.find(
      (inventory) => String(inventory.store._id) === currentStoreId
    );
  }

  const getCartItem = (productId: string) =>
    cartItems.find((item) => item.product._id === productId);

  const addToCart = (item: ProductInventory) => {
    const inventory = getCurrentStoreInventory(item);
    const availableStock = inventory?.availableStock || 0;
    const currentQuantity = getCartItem(item.product._id)?.quantity || 0;

    if (availableStock <= 0 || currentQuantity >= availableStock) {
      Alert.alert(
        "Không đủ tồn kho",
        "Sản phẩm này không còn đủ tồn khả dụng tại chi nhánh hiện tại."
      );
      return;
    }

    setCartItems((current) => {
      const existing = current.find(
        (cartItem) => cartItem.product._id === item.product._id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.product._id === item.product._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [
        ...current,
        {
          availableStock,
          product: item.product,
          quantity: 1,
        },
      ];
    });
  };

  const requestRestock = async (item: ProductInventory) => {
    if (!token || restockSubmittingProductId) {
      return;
    }

    const inventory = getCurrentStoreInventory(item);
    const currentAvailableStock = inventory?.availableStock || 0;
    const requestedQuantity = Math.max(10 - currentAvailableStock, 10);

    try {
      setRestockSubmittingProductId(item.product._id);
      const request = await createRestockRequest(token, {
        productId: item.product._id,
        requestedQuantity,
        reason: `Sales báo cần bổ sung hàng. Tồn khả dụng hiện tại: ${currentAvailableStock}.`,
      });

      setRestockRequests((current) => {
        const exists = current.some((requestItem) => requestItem._id === request._id);

        return exists
          ? current.map((requestItem) =>
              requestItem._id === request._id ? request : requestItem
            )
          : [request, ...current];
      });

      Alert.alert(
        "Đã gửi yêu cầu",
        "Manager chi nhánh sẽ thấy yêu cầu bổ sung hàng trong mục kiểm kho."
      );
    } catch (error) {
      Alert.alert("Không gửi được yêu cầu", getErrorMessage(error));
    } finally {
      setRestockSubmittingProductId(null);
    }
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    setCartItems((current) =>
      current.flatMap((item) => {
        if (item.product._id !== productId) {
          return [item];
        }

        if (nextQuantity <= 0) {
          return [];
        }

        if (nextQuantity > item.availableStock) {
          Alert.alert(
            "Vượt tồn khả dụng",
            `Chi nhánh hiện tại chỉ còn ${item.availableStock} sản phẩm khả dụng.`
          );
          return [item];
        }

        return [{ ...item, quantity: nextQuantity }];
      })
    );
  };

  const selectCustomer = (customer: CustomerLookup) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.fullName);
    setCustomerPhone(customer.phone || "");
    setCustomerSearch(customer.phone || customer.email || customer.fullName);
    setCustomerResults([]);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const buildOrderPayload = () => ({
    storeId: currentStoreId,
    customerId: selectedCustomer?.isGuest ? null : selectedCustomer?._id || null,
    customerName: selectedCustomer?.fullName || customerName.trim(),
    customerPhone: selectedCustomer?.phone || customerPhone.trim(),
    items: cartItems.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
    })),
  });

  const validateCart = () => {
    if (!currentStoreId) {
      Alert.alert("Thiếu chi nhánh", "Tài khoản Sales chưa được gán chi nhánh.");
      return false;
    }

    if (cartItems.length === 0) {
      Alert.alert("Giỏ tạm trống", "Hãy thêm ít nhất một sản phẩm vào giỏ.");
      return false;
    }

    if (!selectedCustomer && !customerPhone.trim()) {
      Alert.alert(
        "Thiếu số điện thoại",
        "Vui lòng xin số điện thoại khách vãng lai để có thể tìm lại lịch sử mua hàng sau này."
      );
      return false;
    }

    return true;
  };

  const handleCreateDraft = async () => {
    if (!token || isSubmitting || !validateCart()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const order = await createOfflineOrder(token, buildOrderPayload());
      setPendingOrders((current) => [order, ...current]);
      setCartItems([]);
      clearCustomer();
      setActiveSection("pending");
      Alert.alert("Đã lưu giỏ tạm", "Đơn đang chờ Sales gửi sang thu ngân.");
    } catch (error) {
      Alert.alert("Không tạo được đơn", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndSend = async () => {
    if (!token || isSubmitting || !validateCart()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const order = await createOfflineOrder(token, buildOrderPayload());
      await approveOfflineOrder(token, order._id);
      setCartItems([]);
      clearCustomer();
      setActiveSection("pending");
      Alert.alert(
        "Đã gửi sang thu ngân",
        "Manager có thể mở màn hình bán hàng tại cửa hàng để thanh toán."
      );
      await loadData("refresh");
    } catch (error) {
      Alert.alert("Không gửi được đơn", getErrorMessage(error));
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
      setPendingOrders((current) =>
        current.filter((item) => item._id !== order._id)
      );
      Alert.alert("Đã gửi sang thu ngân", "Manager có thể thanh toán đơn này.");
    } catch (error) {
      Alert.alert("Không gửi được đơn", getErrorMessage(error));
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleDeleteDraftOrder = (order: Order) => {
    if (!token || draftActionOrderId) {
      return;
    }

    Alert.alert(
      "Xóa giỏ tạm",
      "Giỏ tạm này sẽ bị hủy và không chuyển sang thu ngân.",
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xóa giỏ",
          style: "destructive",
          onPress: async () => {
            try {
              setDraftActionOrderId(order._id);
              await cancelOrder(token, order._id, "Sales deleted draft cart");
              setPendingOrders((current) =>
                current.filter((item) => item._id !== order._id)
              );
              setHistoryOrders((current) =>
                current.map((item) =>
                  item._id === order._id
                    ? { ...item, status: "CANCELLED" }
                    : item
                )
              );
            } catch (error) {
              Alert.alert("Không xóa được giỏ tạm", getErrorMessage(error));
            } finally {
              setDraftActionOrderId(null);
            }
          },
        },
      ]
    );
  };

  const handleContinueDraftOrder = (order: Order) => {
    if (!token || draftActionOrderId) {
      return;
    }

    Alert.alert(
      "Tiếp tục chỉnh giỏ",
      "App sẽ đưa giỏ tạm này về giỏ hiện tại và hủy bản nháp cũ để tránh trùng đơn.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tiếp tục",
          onPress: async () => {
            try {
              setDraftActionOrderId(order._id);

              const nextCartItems: CartItem[] = order.items.map((orderItem) => {
                const inventory = productInventories.find(
                  (item) => item.product._id === String(orderItem.productId)
                );
                const currentStoreInventory = inventory
                  ? getCurrentStoreInventory(inventory)
                  : undefined;

                return {
                  availableStock: Math.max(
                    currentStoreInventory?.availableStock || 0,
                    orderItem.quantity
                  ),
                  product:
                    inventory?.product ||
                    ({
                      _id: String(orderItem.productId),
                      brand: "",
                      category: "",
                      createdAt: "",
                      description: "",
                      image: orderItem.image,
                      isActive: true,
                      name: orderItem.name,
                      price: orderItem.unitPrice,
                      skinTypes: [],
                      sku: orderItem.sku,
                      updatedAt: "",
                    } as Product),
                  quantity: orderItem.quantity,
                };
              });

              await cancelOrder(
                token,
                order._id,
                "Sales continued editing draft cart"
              );

              setCartItems(nextCartItems);
              setSelectedCustomer(null);
              setCustomerName(order.customerName || "");
              setCustomerPhone(order.customerPhone || "");
              setCustomerSearch(order.customerPhone || order.customerName || "");
              setPendingOrders((current) =>
                current.filter((item) => item._id !== order._id)
              );
              setHistoryOrders((current) =>
                current.map((item) =>
                  item._id === order._id
                    ? { ...item, status: "CANCELLED" }
                    : item
                )
              );
              setActiveSection("cart");
            } catch (error) {
              Alert.alert("Không mở lại được giỏ tạm", getErrorMessage(error));
            } finally {
              setDraftActionOrderId(null);
            }
          },
        },
      ]
    );
  };

  const renderProductCard = ({ item }: { item: ProductInventory }) => {
    const inventory = getCurrentStoreInventory(item);
    const availableStock = inventory?.availableStock || 0;
    const cartQuantity = getCartItem(item.product._id)?.quantity || 0;
    const canAdd = cartQuantity < availableStock;

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.product.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text numberOfLines={2} style={styles.productName}>
            {item.product.name}
          </Text>
          <Text style={styles.productMeta}>
            {item.product.brand} · {item.product.category}
          </Text>
          <View style={styles.tagRow}>
            {item.product.skinTypes?.slice(0, 2).map((skinType) => (
              <Text key={skinType} style={styles.tag}>
                {skinType}
              </Text>
            ))}
          </View>
          <Text style={styles.productPrice}>{formatPrice(item.product.price)}</Text>
          <Text
            style={[
              styles.stockText,
              availableStock <= 0 && styles.stockTextDanger,
            ]}
          >
            Tồn chi nhánh: {availableStock}
            {cartQuantity ? ` · Trong giỏ: ${cartQuantity}` : ""}
          </Text>
        </View>
        <View style={styles.productActions}>
          <Pressable
            onPress={() => setSelectedInventory(item)}
            style={styles.iconAction}
          >
            <Ionicons color="#252525" name="business-outline" size={18} />
          </Pressable>
          <Pressable
            disabled={!canAdd}
            onPress={() => addToCart(item)}
            style={[styles.addButton, !canAdd && styles.disabledButton]}
          >
            <Ionicons color="#ffffff" name="add" size={20} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SALES TẠI QUẦY</Text>
          <Text style={styles.title}>Tư vấn và tạo đơn</Text>
        </View>
        <Pressable
          onPress={() => setActiveSection("cart")}
          style={styles.cartButton}
        >
          <Ionicons color="#ffffff" name="bag-handle-outline" size={18} />
          <Text style={styles.cartButtonText}>{cartItems.length}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryPanel}>
        <SummaryItem label="SP trong giỏ" value={String(cartItems.length)} />
        <SummaryItem label="Tạm tính" value={formatPrice(cartTotal)} />
        <SummaryItem label="Tồn CN" value={String(currentStoreTotal)} />
      </View>

      <ScrollView
        contentContainerStyle={styles.segmentRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.segmentScroller}
      >
        {tabs.map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveSection(tab.key)}
              style={[styles.segmentButton, isActive && styles.segmentActive]}
            >
              <Ionicons
                color={isActive ? "#ffffff" : "#52605a"}
                name={tab.icon}
                size={15}
              />
              <Text
                numberOfLines={1}
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
      </ScrollView>

      {activeSection === "catalog" ? (
        <CatalogSection
          activeFilterCount={activeProductFilterCount}
          filters={productFilters}
          filterOptions={quickFilterOptions}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onFilterChange={updateProductFilter}
          onRefresh={() => loadData("refresh")}
          onResetFilters={resetProductFilters}
          onSearch={setSearch}
          products={displayedProductInventories}
          renderProductCard={renderProductCard}
          search={search}
        />
      ) : null}

      {activeSection === "inventory" ? (
        <InventorySection
          activeFilterCount={activeProductFilterCount}
          alerts={inventoryAlerts}
          filters={productFilters}
          filterOptions={quickFilterOptions}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onFilterChange={updateProductFilter}
          onOpenInventory={setSelectedInventory}
          onRefresh={() => loadData("refresh")}
          onRequestRestock={requestRestock}
          onResetFilters={resetProductFilters}
          onSearch={setSearch}
          products={displayedProductInventories}
          restockRequests={restockRequests}
          restockSubmittingProductId={restockSubmittingProductId}
          search={search}
        />
      ) : null}

      {activeSection === "cart" ? (
        <CartSection
          cartItems={cartItems}
          cartTotal={cartTotal}
          customerName={customerName}
          customerPhone={customerPhone}
          customerLookupError={customerLookupError}
          customerResults={customerResults}
          customerSearch={customerSearch}
          isCustomerLoading={isCustomerLoading}
          isSubmitting={isSubmitting}
          onClearCustomer={clearCustomer}
          onCreateAndSend={handleCreateAndSend}
          onCreateDraft={handleCreateDraft}
          onSelectCustomer={selectCustomer}
          onSetCustomerName={setCustomerName}
          onSetCustomerPhone={setCustomerPhone}
          onSetCustomerSearch={(value) => {
            setSelectedCustomer(null);
            setCustomerSearch(value);
          }}
          onUpdateQuantity={updateQuantity}
          selectedCustomer={selectedCustomer}
        />
      ) : null}

      {activeSection === "pending" ? (
        <PendingSection
          approvingOrderId={approvingOrderId}
          draftActionOrderId={draftActionOrderId}
          isRefreshing={isRefreshing}
          onApprove={handleApproveOrder}
          onContinueDraft={handleContinueDraftOrder}
          onDeleteDraft={handleDeleteDraftOrder}
          onOpenOrder={setSelectedOrder}
          onRefresh={() => loadData("refresh")}
          orders={pendingOrders}
        />
      ) : null}

      {activeSection === "history" ? (
        <HistorySection
          isRefreshing={isRefreshing}
          onOpenOrder={setSelectedOrder}
          onRefresh={() => loadData("refresh")}
          orders={historyOrders}
        />
      ) : null}

      <InventoryModal
        currentStoreId={currentStoreId}
        inventory={selectedInventory}
        onClose={() => setSelectedInventory(null)}
        onAddToCart={(inventory) => {
          addToCart(inventory);
          setSelectedInventory(null);
          setActiveSection("cart");
        }}
      />

      <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </SafeAreaView>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function CatalogSection({
  activeFilterCount,
  filters,
  filterOptions,
  isLoading,
  isRefreshing,
  onFilterChange,
  onRefresh,
  onResetFilters,
  onSearch,
  products,
  renderProductCard,
  search,
}: {
  activeFilterCount: number;
  filters: ProductQuickFilters;
  filterOptions: {
    brands: string[];
    categories: string[];
    skinTypes: string[];
  };
  isLoading: boolean;
  isRefreshing: boolean;
  onFilterChange: (
    key: keyof ProductQuickFilters,
    value: string | boolean
  ) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  onSearch: (value: string) => void;
  products: ProductInventory[];
  renderProductCard: ({ item }: { item: ProductInventory }) => ReactElement;
  search: string;
}) {
  return (
    <View style={styles.content}>
      <SearchBox
        onChangeText={onSearch}
        placeholder="Tìm sản phẩm, SKU, thương hiệu..."
        value={search}
      />
      <ProductQuickFilterBar
        activeFilterCount={activeFilterCount}
        filters={filters}
        options={filterOptions}
        onChange={onFilterChange}
        onReset={onResetFilters}
      />
      {isLoading ? (
        <LoadingState label="Đang tải sản phẩm..." />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={products}
          keyExtractor={(item) => item.product._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={onRefresh}
            />
          }
          renderItem={renderProductCard}
        />
      )}
    </View>
  );
}

function InventorySection({
  activeFilterCount,
  alerts,
  filters,
  filterOptions,
  isLoading,
  isRefreshing,
  onFilterChange,
  onOpenInventory,
  onRefresh,
  onRequestRestock,
  onResetFilters,
  onSearch,
  products,
  restockRequests,
  restockSubmittingProductId,
  search,
}: {
  activeFilterCount: number;
  alerts: InventoryAlert[];
  filters: ProductQuickFilters;
  filterOptions: {
    brands: string[];
    categories: string[];
    skinTypes: string[];
  };
  isLoading: boolean;
  isRefreshing: boolean;
  onFilterChange: (
    key: keyof ProductQuickFilters,
    value: string | boolean
  ) => void;
  onOpenInventory: (inventory: ProductInventory) => void;
  onRefresh: () => void;
  onRequestRestock: (inventory: ProductInventory) => void;
  onResetFilters: () => void;
  onSearch: (value: string) => void;
  products: ProductInventory[];
  restockRequests: InventoryRestockRequest[];
  restockSubmittingProductId: string | null;
  search: string;
}) {
  const hasOpenRequest = (productId: string) =>
    restockRequests.some(
      (request) =>
        String(request.productId._id) === productId && request.status === "OPEN"
    );

  return (
    <View style={styles.content}>
      <SearchBox
        onChangeText={onSearch}
        placeholder="Kiểm tồn theo tên, SKU, thương hiệu..."
        value={search}
      />
      <ProductQuickFilterBar
        activeFilterCount={activeFilterCount}
        filters={filters}
        options={filterOptions}
        onChange={onFilterChange}
        onReset={onResetFilters}
      />
      {isLoading ? (
        <LoadingState label="Đang tải tồn kho..." />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={products}
          keyExtractor={(item) => "inventory-" + item.product._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={onRefresh}
            />
          }
          ListHeaderComponent={
            <InventoryAlertPanel
              alerts={alerts}
              openRequestCount={restockRequests.length}
            />
          }
          renderItem={({ item }) => {
            const openRequestExists = hasOpenRequest(item.product._id);
            const isSubmitting = restockSubmittingProductId === item.product._id;

            return (
              <Pressable
                onPress={() => onOpenInventory(item)}
                style={styles.inventoryCard}
              >
                <View style={styles.inventoryHeader}>
                  <View style={styles.inventoryInfo}>
                    <Text numberOfLines={2} style={styles.productName}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.productMeta}>
                      {item.product.brand} · {item.product.category}
                    </Text>
                  </View>
                  <Ionicons color="#52605a" name="chevron-forward" size={18} />
                </View>
                {item.inventories.slice(0, 3).map((inventory) => (
                  <View key={inventory.store._id} style={styles.stockRow}>
                    <Text numberOfLines={1} style={styles.stockStoreName}>
                      {inventory.store.name}
                    </Text>
                    <Text
                      style={[
                        styles.stockStoreValue,
                        inventory.availableStock <= 0 && styles.stockTextDanger,
                      ]}
                    >
                      {inventory.availableStock} khả dụng
                    </Text>
                  </View>
                ))}
                <Pressable
                  disabled={openRequestExists || isSubmitting}
                  onPress={() => onRequestRestock(item)}
                  style={[
                    styles.restockButton,
                    openRequestExists && styles.disabledButton,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#252525" />
                  ) : (
                    <>
                      <Ionicons color="#252525" name="notifications-outline" size={17} />
                      <Text style={styles.restockButtonText}>
                        {openRequestExists
                          ? "Đã báo Manager"
                          : "Báo Manager nhập thêm"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function InventoryAlertPanel({
  alerts,
  openRequestCount,
}: {
  alerts: InventoryAlert[];
  openRequestCount: number;
}) {
  const lowStockCount = alerts.filter((alert) => alert.type === "LOW_STOCK").length;
  const expiryCount = alerts.filter((alert) => alert.type !== "LOW_STOCK").length;
  const previewAlerts = alerts.slice(0, 3);

  return (
    <View style={styles.alertPanel}>
      <View style={styles.alertPanelHeader}>
        <View style={styles.alertCopy}>
          <Text style={styles.alertPanelTitle}>Cảnh báo kho chi nhánh</Text>
          <Text style={styles.alertPanelSubtitle}>
            Hệ thống tự báo sản phẩm dưới 10 hoặc sắp hết hạn.
          </Text>
        </View>
        <View style={styles.alertCountBox}>
          <Text style={styles.alertCountValue}>{alerts.length}</Text>
          <Text style={styles.alertCountLabel}>cảnh báo</Text>
        </View>
      </View>

      <View style={styles.alertMetricRow}>
        <AlertMetric label="Sắp hết hàng" value={lowStockCount} />
        <AlertMetric label="Hạn dùng" value={expiryCount} />
        <AlertMetric label="Đã báo Manager" value={openRequestCount} />
      </View>

      {previewAlerts.length > 0 ? (
        <View style={styles.alertList}>
          {previewAlerts.map((alert) => (
            <View key={alert.inventoryId + "-" + alert.type} style={styles.alertRow}>
              <Ionicons
                color={alert.severity === "CRITICAL" ? "#9f2639" : "#9a6b13"}
                name={
                  alert.type === "LOW_STOCK"
                    ? "trending-down-outline"
                    : "calendar-outline"
                }
                size={18}
              />
              <View style={styles.alertCopy}>
                <Text numberOfLines={1} style={styles.alertProductName}>
                  {alert.product.name}
                </Text>
                <Text style={styles.alertText}>
                  {alert.message} · Còn {alert.availableStock}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.alertEmptyText}>
          Chưa có cảnh báo tồn kho hoặc hạn dùng.
        </Text>
      )}
    </View>
  );
}

function AlertMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.alertMetric}>
      <Text style={styles.alertMetricValue}>{value}</Text>
      <Text style={styles.alertMetricLabel}>{label}</Text>
    </View>
  );
}

function ProductQuickFilterBar({
  activeFilterCount,
  filters,
  onChange,
  onReset,
  options,
}: {
  activeFilterCount: number;
  filters: ProductQuickFilters;
  onChange: (key: keyof ProductQuickFilters, value: string | boolean) => void;
  onReset: () => void;
  options: {
    brands: string[];
    categories: string[];
    skinTypes: string[];
  };
}) {
  const quickChips: Array<{
    active: boolean;
    key: string;
    label: string;
    onPress: () => void;
  }> = [
    {
      active: filters.inStockOnly,
      key: "in-stock",
      label: "Còn hàng",
      onPress: () => onChange("inStockOnly", true),
    },
    ...options.brands.slice(0, 4).map((brand) => ({
      active: filters.brand === brand,
      key: `brand-${brand}`,
      label: brand,
      onPress: () => onChange("brand", brand),
    })),
    ...options.categories.slice(0, 4).map((category) => ({
      active: filters.category === category,
      key: `category-${category}`,
      label: category,
      onPress: () => onChange("category", category),
    })),
    ...options.skinTypes.slice(0, 4).map((skinType) => ({
      active: filters.skinType === skinType,
      key: `skin-${skinType}`,
      label: skinType,
      onPress: () => onChange("skinType", skinType),
    })),
  ];

  return (
    <View style={styles.quickFilterPanel}>
      <View style={styles.quickFilterHeader}>
        <View style={styles.quickFilterTitleRow}>
          <Ionicons color="#52605a" name="options-outline" size={17} />
          <Text style={styles.quickFilterTitle}>Lọc nhanh</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.quickFilterBadge}>
              <Text style={styles.quickFilterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </View>
        {activeFilterCount > 0 ? (
          <Pressable onPress={onReset} style={styles.clearFilterButton}>
            <Text style={styles.clearFilterText}>Xóa lọc</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.quickFilterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {quickChips.map((chip) => (
          <FilterChip
            key={chip.key}
            active={chip.active}
            label={chip.label}
            onPress={chip.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        numberOfLines={1}
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CartSection({
  cartItems,
  cartTotal,
  customerName,
  customerPhone,
  customerLookupError,
  customerResults,
  customerSearch,
  isCustomerLoading,
  isSubmitting,
  onClearCustomer,
  onCreateAndSend,
  onCreateDraft,
  onSelectCustomer,
  onSetCustomerName,
  onSetCustomerPhone,
  onSetCustomerSearch,
  onUpdateQuantity,
  selectedCustomer,
}: {
  cartItems: CartItem[];
  cartTotal: number;
  customerName: string;
  customerPhone: string;
  customerLookupError: string;
  customerResults: CustomerLookup[];
  customerSearch: string;
  isCustomerLoading: boolean;
  isSubmitting: boolean;
  onClearCustomer: () => void;
  onCreateAndSend: () => void;
  onCreateDraft: () => void;
  onSelectCustomer: (customer: CustomerLookup) => void;
  onSetCustomerName: (value: string) => void;
  onSetCustomerPhone: (value: string) => void;
  onSetCustomerSearch: (value: string) => void;
  onUpdateQuantity: (productId: string, nextQuantity: number) => void;
  selectedCustomer: CustomerLookup | null;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Khách hàng</Text>
      <View style={styles.customerBox}>
        <SearchBox
          onChangeText={onSetCustomerSearch}
          placeholder="Tìm khách bằng SĐT, email hoặc tên"
          value={customerSearch}
        />
        {isCustomerLoading ? (
          <View style={styles.customerLoading}>
            <ActivityIndicator color="#252525" />
            <Text style={styles.mutedText}>Đang tìm khách...</Text>
          </View>
        ) : null}
        {!isCustomerLoading && customerLookupError ? (
          <View style={styles.customerNotice}>
            <Ionicons color="#9f2639" name="alert-circle-outline" size={17} />
            <Text style={styles.customerNoticeText}>{customerLookupError}</Text>
          </View>
        ) : null}
        {selectedCustomer ? (
          <View style={styles.selectedCustomer}>
            <View style={styles.customerAvatar}>
              <Ionicons color="#2d5a4b" name="person-outline" size={18} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{selectedCustomer.fullName}</Text>
              <Text style={styles.customerMeta}>
                {selectedCustomer.phone || selectedCustomer.email} ·{" "}
                {selectedCustomer.isGuest
                  ? `${selectedCustomer.orderCount || 0} đơn vãng lai`
                  : `${selectedCustomer.points} điểm`}
              </Text>
            </View>
            <Pressable onPress={onClearCustomer} style={styles.smallIconButton}>
              <Ionicons color="#252525" name="close" size={18} />
            </Pressable>
          </View>
        ) : customerResults.length > 0 ? (
          <View style={styles.customerResults}>
            {customerResults.map((customer) => (
              <Pressable
                key={customer._id}
                onPress={() => onSelectCustomer(customer)}
                style={styles.customerResultRow}
              >
                <View>
                  <Text style={styles.customerName}>{customer.fullName}</Text>
                  <Text style={styles.customerMeta}>
                    {customer.phone || customer.email} ·{" "}
                    {customer.isGuest
                      ? `${customer.orderCount || 0} đơn vãng lai`
                      : `${customer.points} điểm`}
                  </Text>
                </View>
                <Ionicons color="#52605a" name="add-circle-outline" size={20} />
              </Pressable>
            ))}
          </View>
        ) : !isCustomerLoading &&
          !customerLookupError &&
          customerSearch.trim().length >= 2 ? (
          <View style={styles.customerNotice}>
            <Ionicons color="#69756f" name="information-circle-outline" size={17} />
            <Text style={styles.customerNoticeText}>
              Không tìm thấy hồ sơ khách. Nhập SĐT bên dưới để lưu lịch sử mua hàng vãng lai.
            </Text>
          </View>
        ) : null}

        {!selectedCustomer ? (
          <>
            <TextInput
              onChangeText={onSetCustomerName}
              placeholder="Tên khách vãng lai"
              placeholderTextColor="#8a948f"
              style={styles.input}
              value={customerName}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={onSetCustomerPhone}
              placeholder="Số điện thoại khách vãng lai *"
              placeholderTextColor="#8a948f"
              style={styles.input}
              value={customerPhone}
            />
          </>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Giỏ hàng tạm</Text>
      {cartItems.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Ionicons color="#7c8781" name="bag-handle-outline" size={30} />
          <Text style={styles.emptyTitle}>Chưa có sản phẩm</Text>
          <Text style={styles.emptyText}>
            Thêm sản phẩm từ tab Tra cứu để tạo giỏ tư vấn tại quầy.
          </Text>
        </View>
      ) : (
        cartItems.map((item) => (
          <View key={item.product._id} style={styles.cartRow}>
            <Image source={{ uri: item.product.image }} style={styles.cartImage} />
            <View style={styles.cartInfo}>
              <Text numberOfLines={2} style={styles.cartName}>
                {item.product.name}
              </Text>
              <Text style={styles.cartMeta}>
                {formatPrice(item.product.price)} · Tồn {item.availableStock}
              </Text>
            </View>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => onUpdateQuantity(item.product._id, item.quantity - 1)}
                style={styles.qtyButton}
              >
                <Ionicons color="#252525" name="remove" size={15} />
              </Pressable>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Pressable
                onPress={() => onUpdateQuantity(item.product._id, item.quantity + 1)}
                style={styles.qtyButton}
              >
                <Ionicons color="#252525" name="add" size={15} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <View style={styles.totalBox}>
        <View>
          <Text style={styles.totalLabel}>Tạm tính</Text>
          <Text style={styles.totalNote}>Chưa thanh toán, chờ Manager thu tiền</Text>
        </View>
        <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={isSubmitting}
          onPress={onCreateDraft}
          style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
        >
          <Text style={styles.secondaryButtonText}>Lưu giỏ tạm</Text>
        </Pressable>
        <Pressable
          disabled={isSubmitting}
          onPress={onCreateAndSend}
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Gửi thu ngân</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function PendingSection({
  approvingOrderId,
  draftActionOrderId,
  isRefreshing,
  onApprove,
  onContinueDraft,
  onDeleteDraft,
  onOpenOrder,
  onRefresh,
  orders,
}: {
  approvingOrderId: string | null;
  draftActionOrderId: string | null;
  isRefreshing: boolean;
  onApprove: (order: Order) => void;
  onContinueDraft: (order: Order) => void;
  onDeleteDraft: (order: Order) => void;
  onOpenOrder: (order: Order) => void;
  onRefresh: () => void;
  orders: Order[];
}) {
  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={orders}
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          tintColor="#252525"
          onRefresh={onRefresh}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyPanel}>
          <Ionicons color="#7c8781" name="send-outline" size={30} />
          <Text style={styles.emptyTitle}>Không có giỏ chờ gửi</Text>
          <Text style={styles.emptyText}>
            Giỏ tạm đã lưu sẽ nằm ở đây trước khi chuyển sang thu ngân.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderCode}>{item.orderCode}</Text>
              <Text style={styles.orderMeta}>
                {item.customerName || "Khách vãng lai"} · {item.items.length} sản phẩm
              </Text>
            </View>
            <Text style={styles.orderTotal}>{formatPrice(item.totalPrice)}</Text>
          </View>
          <View style={styles.orderItems}>
            {item.items.slice(0, 3).map((orderItem) => (
              <Text key={`${item._id}-${orderItem.productId}`} style={styles.orderItemText}>
                {orderItem.name} x{orderItem.quantity}
              </Text>
            ))}
          </View>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => onOpenOrder(item)}
              style={styles.secondaryButton}
            >
              <Ionicons color="#252525" name="eye-outline" size={17} />
              <Text style={styles.secondaryButtonText}>Chi tiết</Text>
            </Pressable>
            <Pressable
              disabled={draftActionOrderId === item._id}
              onPress={() => onContinueDraft(item)}
              style={[
                styles.secondaryButton,
                draftActionOrderId === item._id && styles.disabledButton,
              ]}
            >
              <Ionicons color="#252525" name="create-outline" size={17} />
              <Text style={styles.secondaryButtonText}>Tiếp tục thêm</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              disabled={draftActionOrderId === item._id}
              onPress={() => onDeleteDraft(item)}
              style={[
                styles.dangerButton,
                draftActionOrderId === item._id && styles.disabledButton,
              ]}
            >
              {draftActionOrderId === item._id ? (
                <ActivityIndicator color="#9f2639" />
              ) : (
                <>
                  <Ionicons color="#9f2639" name="trash-outline" size={17} />
                  <Text style={styles.dangerButtonText}>Xóa giỏ</Text>
                </>
              )}
            </Pressable>
            <Pressable
              disabled={approvingOrderId === item._id}
              onPress={() => onApprove(item)}
              style={[
                styles.primaryButton,
                approvingOrderId === item._id && styles.disabledButton,
              ]}
            >
              {approvingOrderId === item._id ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Gửi thu ngân</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const getOrderStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    CANCELLED: "Đã hủy",
    COMPLETED: "Đã hoàn tất",
    PENDING_APPROVAL: "Chờ Sales gửi",
    PENDING_PAYMENT: "Chờ thu ngân",
  };

  return labels[status] || status;
};

const getPaymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    FAILED: "Thanh toán lỗi",
    PAID: "Đã thanh toán",
    UNPAID: "Chưa thanh toán",
  };

  return labels[status] || status;
};

function HistorySection({
  isRefreshing,
  onOpenOrder,
  onRefresh,
  orders,
}: {
  isRefreshing: boolean;
  onOpenOrder: (order: Order) => void;
  onRefresh: () => void;
  orders: Order[];
}) {
  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={orders}
      keyExtractor={(item) => `history-${item._id}`}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          tintColor="#252525"
          onRefresh={onRefresh}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyPanel}>
          <Ionicons color="#7c8781" name="time-outline" size={30} />
          <Text style={styles.emptyTitle}>Chưa có lịch sử đơn</Text>
          <Text style={styles.emptyText}>
            Các đơn Sales tạo tại quầy sẽ được hiển thị tại đây.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpenOrder(item)} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderInfo}>
              <Text style={styles.orderCode}>{item.orderCode}</Text>
              <Text style={styles.orderMeta}>
                {item.customerName || "Khách vãng lai"} · {item.items.length} sản phẩm
              </Text>
            </View>
            <Text style={styles.orderTotal}>{formatPrice(item.totalPrice)}</Text>
          </View>
          <View style={styles.historyStatusRow}>
            <Text style={styles.statusPill}>{getOrderStatusLabel(item.status)}</Text>
            <Text
              style={[
                styles.statusPill,
                item.paymentStatus === "PAID" && styles.statusPillPaid,
              ]}
            >
              {getPaymentStatusLabel(item.paymentStatus)}
            </Text>
          </View>
          <View style={styles.orderItems}>
            {item.items.slice(0, 3).map((orderItem) => (
              <Text key={`${item._id}-${orderItem.productId}`} style={styles.orderItemText}>
                {orderItem.name} x{orderItem.quantity}
              </Text>
            ))}
          </View>
        </Pressable>
      )}
    />
  );
}

function SearchBox({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.searchBox}>
      <Ionicons color="#69756f" name="search-outline" size={18} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8a948f"
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color="#252525" />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

function InventoryModal({
  currentStoreId,
  inventory,
  onAddToCart,
  onClose,
}: {
  currentStoreId: string;
  inventory: ProductInventory | null;
  onAddToCart: (inventory: ProductInventory) => void;
  onClose: () => void;
}) {
  const currentStoreInventory = inventory?.inventories.find(
    (item) => String(item.store._id) === currentStoreId
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={Boolean(inventory)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <SheetCloseButton onPress={onClose} />
          {inventory ? (
            <>
              <Text style={styles.sheetTitle}>Tồn kho hệ thống</Text>
              <Text numberOfLines={2} style={styles.sheetProductName}>
                {inventory.product.name}
              </Text>
              <Text style={styles.sheetPrice}>{formatPrice(inventory.product.price)}</Text>

              <View style={styles.sheetDivider} />

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {inventory.inventories.map((item) => (
                  <StoreInventoryRow
                    key={item.store._id}
                    currentStoreId={currentStoreId}
                    inventory={item}
                  />
                ))}
              </ScrollView>

              <Pressable
                disabled={!currentStoreInventory?.availableStock}
                onPress={() => onAddToCart(inventory)}
                style={[
                  styles.primaryButton,
                  !currentStoreInventory?.availableStock && styles.disabledButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Thêm từ chi nhánh hiện tại
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function StoreInventoryRow({
  currentStoreId,
  inventory,
}: {
  currentStoreId: string;
  inventory: ProductStoreInventory;
}) {
  const isCurrentStore = String(inventory.store._id) === currentStoreId;

  return (
    <View style={styles.sheetStockRow}>
      <View style={styles.sheetStoreInfo}>
        <Text style={styles.sheetStoreName}>
          {inventory.store.name}
          {isCurrentStore ? " · Chi nhánh hiện tại" : ""}
        </Text>
        {inventory.store.address ? (
          <Text numberOfLines={1} style={styles.sheetStoreAddress}>
            {inventory.store.address}
          </Text>
        ) : null}
      </View>
      <View style={styles.sheetStockBox}>
        <Text
          style={[
            styles.sheetStockValue,
            inventory.availableStock <= 0 && styles.stockTextDanger,
          ]}
        >
          {inventory.availableStock}
        </Text>
        <Text style={styles.sheetStockLabel}>khả dụng</Text>
      </View>
    </View>
  );
}

function OrderModal({
  onClose,
  order,
}: {
  onClose: () => void;
  order: Order | null;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={Boolean(order)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <SheetCloseButton onPress={onClose} />
          {order ? (
            <>
              <Text style={styles.sheetTitle}>Chi tiết giỏ chờ gửi</Text>
              <Text style={styles.sheetProductName}>{order.orderCode}</Text>
              <Text style={styles.sheetPrice}>{formatPrice(order.totalPrice)}</Text>
              <View style={styles.sheetDivider} />
              {order.items.map((item) => (
                <View key={`${order._id}-${item.productId}`} style={styles.detailItemRow}>
                  <View style={styles.detailItemInfo}>
                    <Text numberOfLines={2} style={styles.detailItemName}>
                      {item.name}
                    </Text>
                    <Text style={styles.detailItemMeta}>
                      {formatPrice(item.unitPrice)} x{item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.detailItemTotal}>
                    {formatPrice(item.lineTotal)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.closeButton}>
      <Ionicons color="#252525" name="close" size={20} />
    </Pressable>
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
    paddingBottom: 12,
  },
  headerButton: {
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
  cartButton: {
    minWidth: 48,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  cartButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  summaryPanel: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  summaryItem: {
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  summaryLabel: { color: "#69756f", fontSize: 11, fontWeight: "800" },
  summaryValue: {
    marginTop: 4,
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  segmentScroller: {
    flexGrow: 0,
    height: 52,
    maxHeight: 52,
  },
  segmentButton: {
    width: 98,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  segmentActive: { backgroundColor: "#252525", borderColor: "#252525" },
  segmentText: { color: "#52605a", fontSize: 11, fontWeight: "900" },
  segmentTextActive: { color: "#ffffff" },
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 28 },
  listContent: { paddingHorizontal: 18, paddingBottom: 28 },
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
  quickFilterPanel: {
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  quickFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  quickFilterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  quickFilterTitle: {
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
  quickFilterBadge: {
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: "#252525",
  },
  quickFilterBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  clearFilterButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  clearFilterText: {
    color: "#52605a",
    fontSize: 11,
    fontWeight: "900",
  },
  quickFilterRow: {
    gap: 7,
    paddingRight: 6,
  },
  filterChip: {
    maxWidth: 150,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  filterChipActive: {
    backgroundColor: "#252525",
    borderColor: "#252525",
  },
  filterChipText: {
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  loadingState: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
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
  productImage: { width: 62, height: 62, borderRadius: 8, backgroundColor: "#edf0eb" },
  productInfo: { flex: 1 },
  productName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  productMeta: { marginTop: 3, color: "#69756f", fontSize: 11, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
    color: "#2d5a4b",
    fontSize: 10,
    fontWeight: "900",
  },
  productPrice: { marginTop: 5, color: "#2d5a4b", fontSize: 14, fontWeight: "900" },
  stockText: { marginTop: 4, color: "#2d5a4b", fontSize: 12, fontWeight: "800" },
  stockTextDanger: { color: "#9f2639" },
  productActions: { alignItems: "center", gap: 8 },
  iconAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  disabledButton: { opacity: 0.58 },
  inventoryCard: {
    marginTop: 10,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  inventoryHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  inventoryInfo: { flex: 1 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  stockStoreName: { flex: 1, color: "#52605a", fontSize: 12, fontWeight: "800" },
  stockStoreValue: { color: "#2d5a4b", fontSize: 12, fontWeight: "900" },
  restockButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
    borderWidth: 1,
    borderColor: "#d9dfd8",
  },
  restockButtonText: {
    color: "#252525",
    fontSize: 12,
    fontWeight: "900",
  },
  alertPanel: {
    gap: 12,
    marginTop: 10,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  alertPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  alertPanelTitle: {
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  alertPanelSubtitle: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  alertCountBox: {
    width: 72,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fff7eb",
  },
  alertCountValue: {
    color: "#9a6b13",
    fontSize: 20,
    fontWeight: "900",
  },
  alertCountLabel: {
    color: "#9a6b13",
    fontSize: 10,
    fontWeight: "900",
  },
  alertMetricRow: {
    flexDirection: "row",
    gap: 8,
  },
  alertMetric: {
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  alertMetricValue: {
    color: "#1f2522",
    fontSize: 18,
    fontWeight: "900",
  },
  alertMetricLabel: {
    marginTop: 2,
    color: "#69756f",
    fontSize: 10,
    fontWeight: "800",
  },
  alertList: {
    gap: 8,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  alertCopy: {
    flex: 1,
    minWidth: 0,
  },
  alertProductName: {
    color: "#1f2522",
    fontSize: 12,
    fontWeight: "900",
  },
  alertText: {
    marginTop: 2,
    color: "#69756f",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  alertEmptyText: {
    color: "#69756f",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  sectionTitle: { marginTop: 10, marginBottom: 8, color: "#1f2522", fontSize: 15, fontWeight: "900" },
  customerBox: {
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  customerLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  customerNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  customerNoticeText: {
    flex: 1,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  selectedCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  customerAvatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#ffffff",
  },
  customerInfo: { flex: 1 },
  customerName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  customerMeta: { marginTop: 3, color: "#69756f", fontSize: 12, fontWeight: "700" },
  smallIconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#ffffff",
  },
  customerResults: { borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#edf0eb" },
  customerResultRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
    color: "#1f2522",
    fontWeight: "700",
  },
  emptyPanel: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyTitle: { color: "#1f2522", fontSize: 16, fontWeight: "900" },
  emptyText: { color: "#69756f", textAlign: "center", lineHeight: 20, fontWeight: "600" },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 10,
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  cartImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#edf0eb" },
  cartInfo: { flex: 1 },
  cartName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  cartMeta: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "800" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  qtyText: { minWidth: 22, color: "#1f2522", textAlign: "center", fontWeight: "900" },
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  totalLabel: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  totalNote: { marginTop: 4, color: "#c9d4ce", fontSize: 11, fontWeight: "700" },
  totalValue: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9dfd8",
  },
  secondaryButtonText: { color: "#252525", fontSize: 13, fontWeight: "900" },
  dangerButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#fff7f7",
    borderWidth: 1,
    borderColor: "#f0d4d8",
  },
  dangerButtonText: { color: "#9f2639", fontSize: 13, fontWeight: "900" },
  orderCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  orderHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  orderCode: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  orderMeta: { marginTop: 5, color: "#69756f", fontSize: 12, fontWeight: "700" },
  orderTotal: { color: "#2d5a4b", fontSize: 16, fontWeight: "900" },
  orderItems: { gap: 5, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#edf0eb" },
  orderItemText: { color: "#52605a", fontSize: 12, fontWeight: "700" },
  historyStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f4ef",
    color: "#52605a",
    fontSize: 11,
    fontWeight: "900",
  },
  statusPillPaid: {
    backgroundColor: "#e8f4ec",
    color: "#2d5a4b",
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 42,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  sheetScroll: {
    maxHeight: 300,
  },
  sheetScrollContent: {
    paddingBottom: 8,
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
  sheetTitle: { paddingRight: 42, color: "#1f2522", fontSize: 19, fontWeight: "900" },
  sheetProductName: { marginTop: 7, paddingRight: 24, color: "#1f2522", fontSize: 14, fontWeight: "800" },
  sheetPrice: { marginTop: 5, color: "#2d5a4b", fontSize: 15, fontWeight: "900" },
  sheetDivider: { height: 1, marginVertical: 14, backgroundColor: "#edf0eb" },
  sheetStockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  sheetStoreInfo: { flex: 1 },
  sheetStoreName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  sheetStoreAddress: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "700" },
  sheetStockBox: {
    minWidth: 70,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  sheetStockValue: { color: "#2d5a4b", fontSize: 17, fontWeight: "900" },
  sheetStockLabel: { color: "#69756f", fontSize: 10, fontWeight: "900" },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0eb",
  },
  detailItemInfo: { flex: 1 },
  detailItemName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  detailItemMeta: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "700" },
  detailItemTotal: { color: "#2d5a4b", fontSize: 13, fontWeight: "900" },
});
