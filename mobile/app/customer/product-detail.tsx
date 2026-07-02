import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getErrorMessage } from "@/services/api";
import { getProductById } from "@/services/productService";
import { getProductReviews } from "@/services/reviewService";
import { Product } from "@/types/product";
import { Review } from "@/types/review";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.05;
const REVIEW_PREVIEW_COUNT = 2;

const ICON_COLORS: Record<string, string> = {
  "water-outline": "#2f80ed",
  "snow-outline": "#2f80ed",
  "leaf-outline": "#2d5a4b",
  "shield-checkmark-outline": "#2d5a4b",
  "sunny-outline": "#e8943a",
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const formatRelativeTime = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Vừa xong";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks < 4) {
    return `${diffWeeks} tuần trước`;
  }

  return `${Math.floor(diffDays / 30)} tháng trước`;
};

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons
          color="#f5a623"
          key={index}
          name={index < Math.round(rating) ? "star" : "star-outline"}
          size={size}
        />
      ))}
    </View>
  );
}

function SpecRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.specRow, !isLast && styles.specRowDivider]}>
      <View style={styles.specLabelGroup}>
        <Ionicons color="#8c8e8a" name={icon} size={16} />
        <Text style={styles.specLabel}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={styles.specValue}>
        {value}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { addItem, itemCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [areReviewsExpanded, setAreReviewsExpanded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityText, setQuantityText] = useState("1");
  const addedFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const loadProductDetail = useCallback(async () => {
    if (!token || !id) {
      return;
    }

    try {
      setError("");
      const [productResponse, reviewsResponse] = await Promise.all([
        getProductById(token, id),
        getProductReviews(token, id, 20),
      ]);
      setProduct(productResponse);
      setReviews(reviewsResponse);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    setIsLoading(true);
    loadProductDetail();
  }, [loadProductDetail]);

  useEffect(
    () => () => {
      if (addedFeedbackTimeout.current) {
        clearTimeout(addedFeedbackTimeout.current);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#252525" size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons color="#9b9d99" name="alert-circle-outline" size={32} />
        <Text style={styles.errorTitle}>Không thể tải sản phẩm</Text>
        <Text style={styles.errorMessage}>
          {error || "Sản phẩm không tồn tại hoặc đã bị gỡ bỏ."}
        </Text>
        <Pressable onPress={loadProductDetail} style={styles.retryButton}>
          <Ionicons color="#ffffff" name="refresh" size={16} />
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image].filter(Boolean);
  const rating = product.rating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const hasDiscount =
    !!product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) *
          100
      )
    : 0;
  const visibleReviews = areReviewsExpanded
    ? reviews
    : reviews.slice(0, REVIEW_PREVIEW_COUNT);

  const handleImageScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setActiveImageIndex(nextIndex);
  };

  const handleDecreaseQuantity = () => {
    setQuantity((prev) => {
      const next = Math.max(1, prev - 1);
      setQuantityText(String(next));
      return next;
    });
  };

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => {
      const next = prev + 1;
      setQuantityText(String(next));
      return next;
    });
  };

  const handleQuantityChangeText = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    setQuantityText(digitsOnly);

    const parsed = parseInt(digitsOnly, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      setQuantity(parsed);
    }
  };

  const handleQuantityBlur = () => {
    const parsed = parseInt(quantityText, 10);

    if (quantityText === "" || Number.isNaN(parsed) || parsed < 1) {
      setQuantity(1);
      setQuantityText("1");
      return;
    }

    setQuantityText(String(parsed));
  };

  const handleAddToCart = () => {
    addItem({ product, quantity });
    setJustAdded(true);

    if (addedFeedbackTimeout.current) {
      clearTimeout(addedFeedbackTimeout.current);
    }

    addedFeedbackTimeout.current = setTimeout(() => {
      setJustAdded(false);
    }, 1500);
  };

  const handleBuyNow = () => {
    addItem({ product, quantity });
    router.push("/customer/checkout");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={styles.screen}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.mediaSection}>
          <FlatList
            data={images}
            horizontal
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={handleImageScrollEnd}
            pagingEnabled
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.heroImage} />
            )}
            showsHorizontalScrollIndicator={false}
          />

          {images.length > 1 ? (
            <View style={styles.dotsRow}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          <Pressable
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            style={[styles.floatingButton, { top: insets.top + 10, left: 14 }]}
          >
            <Ionicons color="#252525" name="arrow-back" size={20} />
          </Pressable>

          <Pressable
            accessibilityLabel="Giỏ hàng"
            onPress={() => router.push("/customer/cart")}
            style={[
              styles.floatingButton,
              { top: insets.top + 10, right: 14 },
            ]}
          >
            <Ionicons color="#252525" name="bag-handle-outline" size={20} />
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {itemCount > 9 ? "9+" : itemCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            {hasDiscount ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  -{discountPercent}%
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.ratingRow}>
            <StarRow rating={rating} />
            <Text style={styles.ratingText}>
              {rating.toFixed(1)} ({reviewCount})
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount ? (
              <Text style={styles.originalPrice}>
                {formatPrice(product.originalPrice!)}
              </Text>
            ) : null}
          </View>
        </View>

        {product.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MÔ TẢ SẢN PHẨM</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        ) : null}

        {product.volume || product.origin || product.expiryDate ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN SẢN PHẨM</Text>
            <View style={styles.specsCard}>
              {product.volume ? (
                <SpecRow
                  icon="cube-outline"
                  isLast={!product.origin && !product.expiryDate}
                  label="Dung tích"
                  value={product.volume}
                />
              ) : null}
              {product.origin ? (
                <SpecRow
                  icon="earth-outline"
                  isLast={!product.expiryDate}
                  label="Xuất xứ"
                  value={product.origin}
                />
              ) : null}
              {product.expiryDate ? (
                <SpecRow
                  icon="calendar-outline"
                  isLast
                  label="Hạn sử dụng"
                  value={product.expiryDate}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {product.ingredients && product.ingredients.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÀNH PHẦN NỔI BẬT</Text>

            {product.ingredients.map((ingredient, index) => (
              <View key={`${ingredient.title}-${index}`} style={styles.ingredientCard}>
                <View style={styles.ingredientIconCircle}>
                  <Ionicons
                    color={ICON_COLORS[ingredient.icon] || "#2d5a4b"}
                    name={ingredient.icon as any}
                    size={22}
                  />
                </View>
                <View style={styles.ingredientTextWrap}>
                  <Text style={styles.ingredientTitle}>{ingredient.title}</Text>
                  <Text style={styles.ingredientSubtitle}>
                    {ingredient.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>ĐÁNH GIÁ</Text>
            {reviews.length > REVIEW_PREVIEW_COUNT ? (
              <Pressable
                onPress={() => setAreReviewsExpanded((prev) => !prev)}
              >
                <Text style={styles.seeAllText}>
                  {areReviewsExpanded ? "Thu gọn" : "Xem tất cả"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {visibleReviews.length === 0 ? (
            <Text style={styles.emptyReviewsText}>
              Chưa có đánh giá nào cho sản phẩm này.
            </Text>
          ) : (
            visibleReviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {review.customerName.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.reviewName}>
                    {review.customerName}
                  </Text>
                  <Text style={styles.reviewTime}>
                    {formatRelativeTime(review.createdAt)}
                  </Text>
                </View>
                <StarRow rating={review.rating} size={12} />
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.quantitySelectorRow}>
          <Text style={styles.quantityLabel}>Số lượng</Text>
          <View style={styles.quantityControls}>
            <Pressable
              accessibilityLabel="Giảm số lượng"
              onPress={handleDecreaseQuantity}
              style={styles.quantityStepButton}
            >
              <Ionicons color="#252525" name="remove" size={16} />
            </Pressable>
            <TextInput
              keyboardType="numeric"
              onBlur={handleQuantityBlur}
              onChangeText={handleQuantityChangeText}
              style={styles.quantityInput}
              value={quantityText}
            />
            <Pressable
              accessibilityLabel="Tăng số lượng"
              onPress={handleIncreaseQuantity}
              style={styles.quantityStepButton}
            >
              <Ionicons color="#252525" name="add" size={16} />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <Pressable onPress={handleAddToCart} style={styles.addToCartButton}>
            <Ionicons
              color="#252525"
              name={justAdded ? "checkmark" : "bag-add-outline"}
              size={18}
            />
            <Text style={styles.addToCartButtonText}>
              {justAdded ? "Đã thêm" : "Thêm vào giỏ"}
            </Text>
          </Pressable>
          <Pressable onPress={handleBuyNow} style={styles.buyNowButton}>
            <Text style={styles.buyNowButtonText}>Mua ngay</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#ffffff",
  },
  errorTitle: {
    marginTop: 14,
    color: "#2d2e2c",
    fontSize: 16,
    fontWeight: "800",
  },
  errorMessage: {
    marginTop: 7,
    color: "#747673",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 18,
    backgroundColor: "#252525",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 140,
  },
  mediaSection: {
    position: "relative",
    backgroundColor: "#f1f2ef",
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    resizeMode: "cover",
  },
  dotsRow: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  dotActive: {
    width: 16,
    backgroundColor: "#ffffff",
  },
  floatingButton: {
    position: "absolute",
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: "#d9475c",
  },
  cartBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  infoSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  brand: {
    color: "#9a9c98",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  title: {
    flex: 1,
    color: "#212121",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  discountBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fde2e7",
  },
  discountBadgeText: {
    color: "#c33e53",
    fontSize: 12,
    fontWeight: "800",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    color: "#6f716e",
    fontSize: 13,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 14,
  },
  price: {
    color: "#1a1a1a",
    fontSize: 28,
    fontWeight: "900",
  },
  originalPrice: {
    color: "#9a9c98",
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  section: {
    marginTop: 26,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  descriptionText: {
    marginTop: 10,
    color: "#5c5e5b",
    fontSize: 13,
    lineHeight: 20,
  },
  specsCard: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(37, 37, 37, 0.06)",
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 13,
  },
  specRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2ef",
  },
  specLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  specLabel: {
    color: "#8c8e8a",
    fontSize: 13,
    fontWeight: "600",
  },
  specValue: {
    flex: 1,
    color: "#212121",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  ingredientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(37, 37, 37, 0.06)",
  },
  ingredientIconCircle: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#f1f2ef",
  },
  ingredientTextWrap: {
    flex: 1,
  },
  ingredientTitle: {
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
  },
  ingredientSubtitle: {
    marginTop: 2,
    color: "#8c8e8a",
    fontSize: 12,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllText: {
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyReviewsText: {
    marginTop: 12,
    color: "#8c8e8a",
    fontSize: 13,
  },
  reviewCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(37, 37, 37, 0.06)",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#e7e8e5",
  },
  reviewAvatarText: {
    color: "#5c5e5b",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewName: {
    flex: 1,
    color: "#212121",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewTime: {
    color: "#9a9c98",
    fontSize: 11,
  },
  reviewComment: {
    marginTop: 8,
    color: "#5c5e5b",
    fontSize: 13,
    lineHeight: 19,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: "#ffffff",
    boxShadow: "0 -4px 14px rgba(37, 37, 37, 0.08)",
  },
  quantitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quantityLabel: {
    color: "#5c5e5b",
    fontSize: 13,
    fontWeight: "700",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityStepButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 8,
    backgroundColor: "#f7f7f6",
  },
  quantityInput: {
    minWidth: 48,
    height: 34,
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 8,
    paddingVertical: 0,
    textAlign: "center",
    color: "#212121",
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  addToCartButton: {
    flex: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#252525",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  addToCartButtonText: {
    color: "#252525",
    fontSize: 14,
    fontWeight: "800",
  },
  buyNowButton: {
    flex: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  buyNowButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
