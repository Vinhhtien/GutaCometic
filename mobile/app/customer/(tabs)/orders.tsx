import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { cancelOrder, getOrders } from "@/services/orderService";
import { Order } from "@/types/order";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── Constants & Types ────────────────────────────────────────────────────────

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

type TabData = {
  orders: Order[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
};

type OrdersDataState = Record<StatusTabKey, TabData>;

const buildInitialTabState = (): TabData => ({
  orders: [],
  isLoading: false,
  isRefreshing: false,
  error: "",
});

const buildInitialOrdersData = (): OrdersDataState => ({
  pending: buildInitialTabState(),
  shipping: buildInitialTabState(),
  delivered: buildInitialTabState(),
  review: buildInitialTabState(),
  cancelled: buildInitialTabState(),
});

// ─── OrderCard (memoized to prevent unnecessary re-renders on swipe) ──────────

type OrderCardProps = {
  order: Order;
  tabKey: StatusTabKey;
  isCancelling: boolean;
  onPress: () => void;
  onActionPress: (event: any) => void;
};

const OrderCard = memo(function OrderCard({
  order,
  tabKey,
  isCancelling,
  onPress,
  onActionPress,
}: OrderCardProps) {
  const firstItem = order.items[0];

  return (
    <Pressable key={order._id} onPress={onPress} style={styles.orderCard}>
      <View style={styles.orderCardTop}>
        <Text style={styles.orderCode}>{order.orderCode}</Text>
        <View style={styles.channelBadge}>
          <Text style={styles.channelBadgeText}>
            {order.channel === "ONLINE" ? "Online" : "Offline"}
          </Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>

      <View style={styles.itemRow}>
        {firstItem?.image ? (
          <Image
            source={{ uri: firstItem.image }}
            style={styles.itemThumbnail}
          />
        ) : (
          <View style={styles.itemThumbnailPlaceholder}>
            <Ionicons color="#c33e53" name="leaf-outline" size={18} />
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
        <Text style={styles.orderTotal}>{formatPrice(order.totalPrice)}</Text>
        <Pressable
          disabled={isCancelling}
          onPress={onActionPress}
          style={[
            styles.actionButton,
            tabKey === "pending" && styles.actionButtonDanger,
          ]}
        >
          {isCancelling ? (
            <ActivityIndicator color="#252525" size="small" />
          ) : (
            <Text
              style={[
                styles.actionButtonText,
                tabKey === "pending" && styles.actionButtonTextDanger,
              ]}
            >
              {getActionLabel(tabKey)}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
});

// ─── TabPage (memoized to prevent re-renders of off-screen tab pages) ─────────

type TabPageProps = {
  tab: StatusTab;
  tabData: TabData;
  windowWidth: number;
  cancellingOrderId: string | null;
  onRefresh: () => void;
  onOrderPress: (order: Order) => void;
  onActionPress: (order: Order) => void;
};

const TabPage = memo(function TabPage({
  tab,
  tabData,
  windowWidth,
  cancellingOrderId,
  onRefresh,
  onOrderPress,
  onActionPress,
}: TabPageProps) {
  const { orders, isLoading, isRefreshing, error } = tabData;

  return (
    <View style={{ width: windowWidth, flex: 1 }}>
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
            <RefreshControl onRefresh={onRefresh} refreshing={isRefreshing} />
          }
          style={styles.scrollBody}
        >
          <View style={styles.emptyIcon}>
            <Ionicons color="#2d5a4b" name="receipt-outline" size={26} />
          </View>
          <Text style={styles.emptyTitle}>Không có đơn hàng nào</Text>
          <Text style={styles.emptyMessage}>
            Đơn hàng thuộc trạng thái "{tab.label}" sẽ hiển thị ở đây.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl onRefresh={onRefresh} refreshing={isRefreshing} />
          }
          showsVerticalScrollIndicator={false}
          style={styles.scrollBody}
        >
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              isCancelling={cancellingOrderId === order._id}
              order={order}
              tabKey={tab.key}
              onActionPress={(e) => {
                e.stopPropagation();
                onActionPress(order);
              }}
              onPress={() => onOrderPress(order)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { token } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  // Active tab index (source of truth for both tab bar and pager)
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-tab data cache (orders + loading states)
  const [ordersData, setOrdersData] = useState<OrdersDataState>(
    buildInitialOrdersData
  );

  // Tracks which tab INDEXES have been fetched at least once for lazy loading
  // Using state (not ref) so renderItem can react to it and show skeletons correctly
  const [loadedTabs, setLoadedTabs] = useState<number[]>([]);

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );

  const flatListRef = useRef<FlatList>(null);
  const tabScrollRef = useRef<ScrollView>(null);

  // ── Fetch Logic ─────────────────────────────────────────────────────────────

  const loadOrdersForTab = useCallback(
    async (tabKey: StatusTabKey, isRefresh = false) => {
      if (!token) return;

      const tab = STATUS_TABS.find((t) => t.key === tabKey);
      if (!tab) return;

      // Set loading / refreshing state
      setOrdersData((prev) => ({
        ...prev,
        [tabKey]: {
          ...prev[tabKey],
          error: "",
          isLoading: !isRefresh,
          isRefreshing: isRefresh,
        },
      }));

      try {
        const response = await getOrders(token, tab.apiStatus);
        setOrdersData((prev) => ({
          ...prev,
          [tabKey]: {
            orders: response,
            isLoading: false,
            isRefreshing: false,
            error: "",
          },
        }));
      } catch (requestError) {
        setOrdersData((prev) => ({
          ...prev,
          [tabKey]: {
            ...prev[tabKey],
            isLoading: false,
            isRefreshing: false,
            error: getErrorMessage(requestError),
          },
        }));
      }
    },
    [token]
  );

  // ── Lazy Load: fetch a tab only the FIRST time it becomes active ─────────────

  const fetchTabIfNeeded = useCallback(
    (index: number) => {
      const tabKey = STATUS_TABS[index].key;
      setLoadedTabs((prev) => {
        if (prev.includes(index)) {
          // Already loaded → return cache, do NOT call API again
          return prev;
        }
        // Mark as loaded and trigger fetch
        loadOrdersForTab(tabKey);
        return [...prev, index];
      });
    },
    [loadOrdersForTab]
  );

  // ── Initial load for the first tab (index 0) ─────────────────────────────────

  useEffect(() => {
    fetchTabIfNeeded(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Reset everything when token changes (login / logout)
  useEffect(() => {
    setOrdersData(buildInitialOrdersData());
    setLoadedTabs([]);
    setActiveIndex(0);
    flatListRef.current?.scrollToIndex({ index: 0, animated: false });
  }, [token]);

  // ── Auto-scroll the tab bar header to keep active tab visible ────────────────

  useEffect(() => {
    const approxTabWidth = 110;
    const targetOffset = Math.max(0, activeIndex * approxTabWidth - 80);
    tabScrollRef.current?.scrollTo({ x: targetOffset, animated: true });
  }, [activeIndex]);

  // ── Event Handlers ───────────────────────────────────────────────────────────

  // CHIỀU 1: User finishes swiping → detect landed page, update tab bar & lazy-load
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / windowWidth);
      if (index >= 0 && index < STATUS_TABS.length) {
        setActiveIndex(index);
        fetchTabIfNeeded(index);
      }
    },
    [windowWidth, fetchTabIfNeeded]
  );

  // CHIỀU 2: User taps a tab header → scroll pager to that page & lazy-load
  const handleTabPress = useCallback(
    (index: number) => {
      setActiveIndex(index);
      flatListRef.current?.scrollToIndex({ index, animated: true });
      fetchTabIfNeeded(index);
    },
    [fetchTabIfNeeded]
  );

  const handleCancelOrder = useCallback(
    (orderId: string, tabKey: StatusTabKey) => {
      Alert.alert(
        "Xác nhận",
        "Bạn có chắc chắn muốn hủy đơn hàng này không?",
        [
          { text: "Không", style: "cancel" },
          {
            text: "Đồng ý",
            style: "destructive",
            onPress: async () => {
              if (!token) return;
              try {
                setCancellingOrderId(orderId);
                await cancelOrder(token, orderId);
                // Force-refresh current tab data after cancellation
                await loadOrdersForTab(tabKey, false);
                Alert.alert("Thành công", "Đã hủy đơn hàng thành công");
              } catch (requestError) {
                Alert.alert(
                  "Không thể hủy đơn",
                  getErrorMessage(requestError)
                );
              } finally {
                setCancellingOrderId(null);
              }
            },
          },
        ]
      );
    },
    [token, loadOrdersForTab]
  );

  const handleActionPress = useCallback(
    (order: Order, tabKey: StatusTabKey) => {
      if (tabKey === "pending") {
        handleCancelOrder(order._id, tabKey);
        return;
      }
      if (tabKey === "review") {
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
    },
    [handleCancelOrder]
  );

  const handleOrderPress = useCallback((order: Order) => {
    router.push({
      pathname: "/customer/order-detail",
      params: { id: order._id },
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
      </View>

      {/* Tab Bar */}
      <ScrollView
        ref={tabScrollRef}
        contentContainerStyle={styles.tabsRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
      >
        {STATUS_TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(index)}
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

      {/* Horizontal Pager */}
      <FlatList
        ref={flatListRef}
        data={STATUS_TABS}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        // Only fires AFTER swipe momentum stops → prevents rapid API spam
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // Pre-renders 1 adjacent page each side for smooth peek-preview
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        getItemLayout={(_data, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        renderItem={({ item: tab }: { item: StatusTab }) => (
          <TabPage
            cancellingOrderId={cancellingOrderId}
            tab={tab}
            tabData={ordersData[tab.key]}
            windowWidth={windowWidth}
            onActionPress={(order) => handleActionPress(order, tab.key)}
            onOrderPress={handleOrderPress}
            onRefresh={() => loadOrdersForTab(tab.key, true)}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
