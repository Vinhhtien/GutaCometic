import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
import {
  deleteReview,
  getReviewByOrder,
} from "@/services/reviewService";
import { Order } from "@/types/order";
import { Review } from "@/types/review";

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
  | "paid"
  | "shipping"
  | "delivered"
  | "review"
  | "cancelled";

type StatusTab = {
  key: StatusTabKey;
  label: string;
  apiStatus: string;
  paymentStatus?: string;
};

const STATUS_TABS: StatusTab[] = [
  { key: "pending", label: "Chờ xác nhận", apiStatus: "PENDING" },
  {
    key: "paid",
    label: "Đã thanh toán",
    apiStatus: "PENDING",
    paymentStatus: "PAID",
  },
  {
    key: "shipping",
    label: "Chờ giao hàng",
    apiStatus: "PREPARING,READY_FOR_PICKUP",
  },
  { key: "delivered", label: "Đã giao", apiStatus: "COMPLETED" },
  // Tab "Đánh giá" fetch TẤT CẢ đơn COMPLETED (cả đã và chưa đánh giá)
  // để hiển thị ReviewPreview cho đơn đã đánh giá
  { key: "review", label: "Đánh giá", apiStatus: "COMPLETED" },
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
  paid: buildInitialTabState(),
  shipping: buildInitialTabState(),
  delivered: buildInitialTabState(),
  review: buildInitialTabState(),
  cancelled: buildInitialTabState(),
});

// ─── ReviewPreview – hiển thị đánh giá đã có + nút Sửa / Xóa ─────────────────

type ReviewPreviewProps = {
  review: Review;
  onEdit: () => void;
  onDelete: () => void;
};

const ReviewPreview = memo(function ReviewPreview({
  review,
  onEdit,
  onDelete,
}: ReviewPreviewProps) {
  return (
    <View style={styles.reviewPreview}>
      {/* Header: sao + 2 nút */}
      <View style={styles.reviewPreviewHeader}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              color={s <= review.rating ? "#f5a623" : "#e0e1dc"}
              name={s <= review.rating ? "star" : "star-outline"}
              size={14}
            />
          ))}
        </View>
        <View style={styles.reviewActions}>
          <Pressable
            hitSlop={8}
            onPress={onEdit}
            style={styles.reviewActionBtn}
          >
            <Ionicons color="#2d5a4b" name="pencil-outline" size={15} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={onDelete}
            style={[styles.reviewActionBtn, styles.reviewActionBtnDanger]}
          >
            <Ionicons color="#c33e53" name="trash-outline" size={15} />
          </Pressable>
        </View>
      </View>

      {/* Comment */}
      {!!review.comment && (
        <Text numberOfLines={2} style={styles.reviewComment}>
          {review.comment}
        </Text>
      )}

      {/* Ảnh thumbnail */}
      {review.images && review.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewImagesScroll}
        >
          <View style={styles.reviewImagesRow}>
            {review.images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={styles.reviewImageThumb}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
});

// ─── OrderCard (memoized to prevent unnecessary re-renders on swipe) ──────────

type OrderCardProps = {
  order: Order;
  tabKey: StatusTabKey;
  isCancelling: boolean;
  review: Review | null | undefined; // undefined = chưa tải, null = không có
  onPress: () => void;
  onActionPress: (event: any) => void;
  onEditReview: (review: Review) => void;
  onDeleteReview: (review: Review) => void;
};

const OrderCard = memo(function OrderCard({
  order,
  tabKey,
  isCancelling,
  review,
  onPress,
  onActionPress,
  onEditReview,
  onDeleteReview,
}: OrderCardProps) {
  const firstItem = order.items[0];

  // Kiểm tra đủ điều kiện hiển thị nút "Đánh giá ngay"
  const isCompleted =
    order.status === "COMPLETED" ||
    order.status === "completed" ||
    order.status === "delivered";

  // Chỉ hiện nút đánh giá khi ở tab review VÀ chưa đánh giá
  const canReview = tabKey === "review" && isCompleted && order.isReviewed !== true;
  // Hiện review preview khi ở tab review VÀ đã đánh giá (có review trong cache)
  const hasReview = tabKey === "review" && order.isReviewed === true && !!review;

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

      {/* ── Khu vực đánh giá đã có ─────────────────────────────────────────── */}
      {hasReview && review && (
        <ReviewPreview
          review={review}
          onDelete={() => onDeleteReview(review)}
          onEdit={() => onEditReview(review)}
        />
      )}

      <View style={styles.orderCardBottom}>
        <Text style={styles.orderTotal}>{formatPrice(order.totalPrice)}</Text>

        {/* ── Nút "Đánh giá ngay" ─────────────────────────────────────────── */}
        {canReview ? (
          <Pressable onPress={onActionPress} style={styles.reviewButton}>
            <Ionicons color="#2d5a4b" name="star-outline" size={14} />
            <Text style={styles.reviewButtonText}>Đánh giá ngay</Text>
          </Pressable>
        ) : (
          /* ── Nút hành động thông thường ──────────────────────────────────── */
          tabKey !== "review" && (
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
          )
        )}
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
  reviewsMap: Record<string, Review | null>;
  onRefresh: () => void;
  onOrderPress: (order: Order) => void;
  onActionPress: (order: Order) => void;
  onEditReview: (order: Order, review: Review) => void;
  onDeleteReview: (order: Order, review: Review) => void;
};

const TabPage = memo(function TabPage({
  tab,
  tabData,
  windowWidth,
  cancellingOrderId,
  reviewsMap,
  onRefresh,
  onOrderPress,
  onActionPress,
  onEditReview,
  onDeleteReview,
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
              review={reviewsMap[order._id]}
              tabKey={tab.key}
              onActionPress={(e) => {
                e.stopPropagation();
                onActionPress(order);
              }}
              onDeleteReview={(review) => onDeleteReview(order, review)}
              onEditReview={(review) => onEditReview(order, review)}
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [ordersData, setOrdersData] = useState<OrdersDataState>(
    buildInitialOrdersData
  );
  const [loadedTabs, setLoadedTabs] = useState<number[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Cache đánh giá theo orderId (undefined = chưa tải, null = không có đánh giá)
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review | null>>({});

  const flatListRef = useRef<FlatList>(null);
  const tabScrollRef = useRef<ScrollView>(null);

  // ── Tải đánh giá cho các đơn đã reviewed ──────────────────────────────────
  // Dùng ref để tránh stale closure khi check cache
  const reviewsMapRef = useRef<Record<string, Review | null>>({});

  const loadReviewsForOrders = useCallback(
    async (orders: Order[]) => {
      if (!token) return;
      const reviewedOrders = orders.filter((o) => o.isReviewed === true);
      if (reviewedOrders.length === 0) return;

      await Promise.allSettled(
        reviewedOrders.map(async (order) => {
          // Dùng ref thay vì state để luôn check giá trị mới nhất
          if (order._id in reviewsMapRef.current) return;
          try {
            const review = await getReviewByOrder(token, order._id);
            reviewsMapRef.current = { ...reviewsMapRef.current, [order._id]: review };
            setReviewsMap((prev) => ({ ...prev, [order._id]: review }));
          } catch {
            reviewsMapRef.current = { ...reviewsMapRef.current, [order._id]: null };
            setReviewsMap((prev) => ({ ...prev, [order._id]: null }));
          }
        })
      );
    },
    [token]
  );

  // ── Xóa cache review của 1 đơn (dùng khi xóa review để re-fetch) ────────────
  const invalidateReviewCache = useCallback((orderId: string) => {
    delete reviewsMapRef.current[orderId];
    setReviewsMap((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  // ── Fetch Logic ─────────────────────────────────────────────────────────────

  const loadOrdersForTab = useCallback(
    async (tabKey: StatusTabKey, isRefresh = false) => {
      if (!token) return;

      const tab = STATUS_TABS.find((t) => t.key === tabKey);
      if (!tab) return;

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
        const response = await getOrders(
          token,
          tab.apiStatus,
          tab.paymentStatus || (tab.key === "pending" ? "UNPAID" : undefined)
        );
        setOrdersData((prev) => ({
          ...prev,
          [tabKey]: {
            orders: response,
            isLoading: false,
            isRefreshing: false,
            error: "",
          },
        }));
        // Tải đánh giá ngay sau khi có danh sách đơn
        loadReviewsForOrders(response);
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
    [token, loadReviewsForOrders]
  );

  // ── Lazy Load ─────────────────────────────────────────────────────────────

  const fetchTabIfNeeded = useCallback(
    (index: number) => {
      const tabKey = STATUS_TABS[index].key;
      setLoadedTabs((prev) => {
        if (prev.includes(index)) return prev;
        loadOrdersForTab(tabKey);
        return [...prev, index];
      });
    },
    [loadOrdersForTab]
  );

  useEffect(() => {
    fetchTabIfNeeded(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setOrdersData(buildInitialOrdersData());
    setLoadedTabs([]);
    setActiveIndex(0);
    reviewsMapRef.current = {};
    setReviewsMap({});
    flatListRef.current?.scrollToIndex({ index: 0, animated: false });
  }, [token]);

  // ── Re-fetch tab đang active mỗi khi màn hình được focus lại ─────────────────
  // Đảm bảo dữ liệu luôn mới sau khi user quay về từ write-review
  useFocusEffect(
    useCallback(() => {
      const activeTabKey = STATUS_TABS[activeIndex]?.key;
      if (!activeTabKey || !token) return;
      // Force refresh (không dùng cache loadedTabs)
      loadOrdersForTab(activeTabKey, true);
      // Xóa cache review để tải lại
      reviewsMapRef.current = {};
      setReviewsMap({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, activeIndex])
  );

  useEffect(() => {
    const approxTabWidth = 110;
    const targetOffset = Math.max(0, activeIndex * approxTabWidth - 80);
    tabScrollRef.current?.scrollTo({ x: targetOffset, animated: true });
  }, [activeIndex]);

  // ── Event Handlers ───────────────────────────────────────────────────────────

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
        router.push({
          pathname: "/customer/write-review" as any,
          params: { orderId: order._id },
        });
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

  // ── Xóa đánh giá ─────────────────────────────────────────────────────────

  const handleDeleteReview = useCallback(
    (order: Order, review: Review) => {
      Alert.alert(
        "Xóa đánh giá",
        "Bạn có chắc chắn muốn xóa đánh giá này không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: async () => {
              if (!token) return;
              try {
                await deleteReview(token, review._id);
                // Xóa cache review (cả ref lẫn state)
                invalidateReviewCache(order._id);
                // Cập nhật isReviewed = false trực tiếp trong local state
                setOrdersData((prev) => {
                  const updated = { ...prev };
                  for (const key of Object.keys(updated) as StatusTabKey[]) {
                    updated[key] = {
                      ...updated[key],
                      orders: updated[key].orders.map((o) =>
                        o._id === order._id ? { ...o, isReviewed: false } : o
                      ),
                    };
                  }
                  return updated;
                });
                Alert.alert("Đã xóa", "Đánh giá của bạn đã được xóa.");
              } catch (err) {
                Alert.alert("Lỗi", getErrorMessage(err));
              }
            },
          },
        ]
      );
    },
    [token, invalidateReviewCache]
  );

  // ── Sửa đánh giá ─────────────────────────────────────────────────────────

  const handleEditReview = useCallback((order: Order, review: Review) => {
    router.push({
      pathname: "/customer/write-review" as any,
      params: {
        orderId: order._id,
        reviewId: review._id,
        mode: "edit",
        initialRating: String(review.rating),
        initialComment: review.comment,
        initialImages: JSON.stringify(review.images ?? []),
      },
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
        onMomentumScrollEnd={handleMomentumScrollEnd}
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
            reviewsMap={reviewsMap}
            tab={tab}
            tabData={ordersData[tab.key]}
            windowWidth={windowWidth}
            onActionPress={(order) => handleActionPress(order, tab.key)}
            onDeleteReview={(order, review) =>
              handleDeleteReview(order, review)
            }
            onEditReview={(order, review) => handleEditReview(order, review)}
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
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a8cfc3",
    backgroundColor: "#eaf2ee",
  },
  reviewButtonText: {
    color: "#2d5a4b",
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Review Preview ───────────────────────────────────────────────────────────
  reviewPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f8f9f6",
    borderWidth: 1,
    borderColor: "#e8ebe4",
  },
  reviewPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 6,
  },
  reviewActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf2ee",
  },
  reviewActionBtnDanger: {
    backgroundColor: "#fff0f2",
  },
  reviewComment: {
    marginTop: 6,
    color: "#4a4c49",
    fontSize: 12,
    lineHeight: 17,
  },
  reviewImagesScroll: {
    marginTop: 8,
  },
  reviewImagesRow: {
    flexDirection: "row",
    gap: 6,
  },
  reviewImageThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#e8ebe4",
  },
});
