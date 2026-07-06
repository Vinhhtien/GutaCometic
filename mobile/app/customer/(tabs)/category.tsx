import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useWishlist } from "@/contexts/WishlistContext";
import { getErrorMessage } from "@/services/api";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const skinTypeFilters = [
  { label: "Tất cả", value: "" },
  { label: "Da dầu", value: "Da dầu" },
  { label: "Da khô", value: "Da khô" },
  { label: "Da nhạy cảm", value: "Da nhạy cảm" },
  { label: "Da mụn", value: "Da mụn" },
  { label: "Da lão hóa", value: "Da lão hóa" },
  { label: "Da thường", value: "Da thường" },
];

const BRAND_OPTIONS = [
  "La Roche-Posay",
  "Vichy",
  "GUTA Test",
  "Bioderma",
  "CeraVe",
  "Neutrogena",
];

const SKIN_TYPE_OPTIONS = [
  "Da dầu",
  "Da khô",
  "Da nhạy cảm",
  "Da mụn",
  "Da lão hóa",
  "Da thường",
];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FilterState {
  minPrice: string;
  maxPrice: string;
  selectedBrand: string;
  selectedSkinType: string;
}

const DEFAULT_FILTER: FilterState = {
  minPrice: "",
  maxPrice: "",
  selectedBrand: "",
  selectedSkinType: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    selectedCategory?: string;
    search?: string;
    // Filter values passed back from filter.tsx via router.navigate
    filterMinPrice?: string;
    filterMaxPrice?: string;
    filterBrand?: string;
    filterSkinType?: string;
    filterTs?: string; // timestamp to force re-read
  }>();

  // ── Server-fetch state ──
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState(params.search ?? "");
  const [search, setSearch] = useState(params.search ?? "");
  const [category, setCategory] = useState(params.selectedCategory ?? "");
  const [skinType, setSkinType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ── Applied filter — read from params returned by filter.tsx ──
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(
    DEFAULT_FILTER
  );

  // Sync filter whenever filter.tsx navigates back with new values
  useEffect(() => {
    const fp = params.filterTs; // only update when filter screen applied
    if (!fp) return;
    setAppliedFilter({
      minPrice: params.filterMinPrice ?? "",
      maxPrice: params.filterMaxPrice ?? "",
      selectedBrand: params.filterBrand ?? "",
      selectedSkinType: params.filterSkinType ?? "",
    });
  }, [params.filterTs]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    setSearchText(params.search ?? "");
    setSearch(params.search ?? "");
    setCategory(params.selectedCategory ?? "");
  }, [params.search, params.selectedCategory]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const data = await getProducts(token, { search, skinType, category });
      setAllProducts(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, search, skinType, category]);

  useEffect(() => {
    setIsLoading(true);
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts();
  };

  // ── Open filter screen ──
  const handleOpenFilter = () => {
    router.push({
      pathname: "/customer/filter" as any,
      params: {
        minPrice: appliedFilter.minPrice,
        maxPrice: appliedFilter.maxPrice,
        selectedBrand: appliedFilter.selectedBrand,
        selectedSkinType: appliedFilter.selectedSkinType,
      },
    });
  };

  // ── Derived: products after client-side filter ──
  const products = useMemo<Product[]>(() => {
    const min = appliedFilter.minPrice
      ? parseFloat(appliedFilter.minPrice)
      : null;
    const max = appliedFilter.maxPrice
      ? parseFloat(appliedFilter.maxPrice)
      : null;
    const brand = appliedFilter.selectedBrand;
    const st = appliedFilter.selectedSkinType;

    // If no advanced filter is active just return everything from server
    if (min === null && max === null && !brand && !st) return allProducts;

    return allProducts.filter((p) => {
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (brand && p.brand.toLowerCase() !== brand.toLowerCase()) return false;
      if (st && !p.skinTypes.some((s) => s === st)) return false;
      return true;
    });
  }, [allProducts, appliedFilter]);

  // Count active advanced filters for badge
  const activeFilterCount = [
    appliedFilter.minPrice,
    appliedFilter.maxPrice,
    appliedFilter.selectedBrand,
    appliedFilter.selectedSkinType,
  ].filter(Boolean).length;

  const isFilterActive = activeFilterCount > 0;

  // ── Reset filter ──
  const handleResetFilter = () => {
    setAppliedFilter(DEFAULT_FILTER);
  };

  // ── Determine correct empty-state message ──
  const emptyTitle = error
    ? "Không thể tải sản phẩm"
    : isFilterActive
    ? "Không tìm thấy sản phẩm phù hợp"
    : "Không tìm thấy sản phẩm";

  const emptyMessage = error
    ? error
    : isFilterActive
    ? "Không có sản phẩm nào khớp với bộ lọc nâng cao. Hãy thử thay đổi tiêu chí lọc."
    : "Hãy thử thay đổi từ khóa hoặc bộ lọc loại da.";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <FlatList
        columnWrapperStyle={products.length > 0 ? styles.row : undefined}
        contentContainerStyle={styles.content}
        data={products}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color="#252525"
              size="large"
              style={styles.loader}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  color={isFilterActive ? "#c33e53" : "#9b9d99"}
                  name={
                    isFilterActive ? "filter-outline" : "search-outline"
                  }
                  size={28}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyMessage}>{emptyMessage}</Text>
              {isFilterActive && (
                <Pressable
                  onPress={handleResetFilter}
                  style={styles.emptyResetBtn}
                >
                  <Text style={styles.emptyResetBtnText}>
                    Xóa bộ lọc nâng cao
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
        ListHeaderComponent={
          <>
            {/* ── Search bar ── */}
            <View style={styles.searchBar}>
              <Ionicons color="#767676" name="search-outline" size={20} />
              <TextInput
                onChangeText={setSearchText}
                placeholder="Tìm kiếm sản phẩm chăm sóc da..."
                placeholderTextColor="#8f8f8f"
                style={styles.searchInput}
                value={searchText}
              />
              <Pressable
                accessibilityLabel="Mở bộ lọc nâng cao"
                onPress={handleOpenFilter}
                style={[
                  styles.filterButton,
                  isFilterActive && styles.filterButtonActive,
                ]}
              >
                <Ionicons color="#ffffff" name="options-outline" size={19} />
                {isFilterActive && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* ── Active filter chips summary ── */}
            {isFilterActive && (
              <ScrollView
                contentContainerStyle={styles.activeFilterBar}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {appliedFilter.minPrice !== "" ||
                appliedFilter.maxPrice !== "" ? (
                  <View style={styles.activeFilterChip}>
                    <Ionicons
                      color="#c33e53"
                      name="cash-outline"
                      size={12}
                    />
                    <Text style={styles.activeFilterChipText}>
                      {appliedFilter.minPrice
                        ? `${parseInt(appliedFilter.minPrice).toLocaleString("vi-VN")}đ`
                        : "0đ"}{" "}
                      –{" "}
                      {appliedFilter.maxPrice
                        ? `${parseInt(appliedFilter.maxPrice).toLocaleString("vi-VN")}đ`
                        : "∞"}
                    </Text>
                  </View>
                ) : null}

                {appliedFilter.selectedBrand ? (
                  <View style={styles.activeFilterChip}>
                    <Ionicons
                      color="#c33e53"
                      name="pricetag-outline"
                      size={12}
                    />
                    <Text style={styles.activeFilterChipText}>
                      {appliedFilter.selectedBrand}
                    </Text>
                  </View>
                ) : null}

                {appliedFilter.selectedSkinType ? (
                  <View style={styles.activeFilterChip}>
                    <Ionicons
                      color="#c33e53"
                      name="sparkles-outline"
                      size={12}
                    />
                    <Text style={styles.activeFilterChipText}>
                      {appliedFilter.selectedSkinType}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleResetFilter}
                  style={styles.activeFilterClearChip}
                >
                  <Ionicons color="#666865" name="close" size={12} />
                  <Text style={styles.activeFilterClearText}>Xóa tất cả</Text>
                </Pressable>
              </ScrollView>
            )}

            {/* ── Category active bar ── */}
            {category ? (
              <View style={styles.activeCategoryBar}>
                <Text style={styles.activeCategoryText}>
                  Danh mục: {category}
                </Text>
                <Pressable
                  accessibilityLabel="Bỏ chọn danh mục"
                  hitSlop={8}
                  onPress={() => setCategory("")}
                >
                  <Ionicons color="#252525" name="close-circle" size={18} />
                </Pressable>
              </View>
            ) : null}

            {/* ── Skin type quick-filter row ── */}
            <ScrollView
              contentContainerStyle={styles.filterList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {skinTypeFilters.map((item) => {
                const isActive = skinType === item.value;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => setSkinType(item.value)}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error && products.length > 0 ? (
              <View style={styles.inlineError}>
                <Ionicons
                  color="#b4233a"
                  name="alert-circle-outline"
                  size={16}
                />
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        numColumns={2}
        refreshControl={
          <RefreshControl
            colors={["#252525"]}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            tintColor="#252525"
          />
        }
        renderItem={({ item }) => <ProductGridCard product={item} />}
        showsVerticalScrollIndicator={false}
        style={styles.screen}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductGridCard
// ─────────────────────────────────────────────────────────────────────────────

function ProductGridCard({ product }: { product: Product }) {
  const { isLiked, toggleLike } = useWishlist();
  const isFavorite = isLiked(product._id);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/customer/product-detail",
          params: { id: product._id },
        })
      }
      style={styles.card}
    >
      <View style={styles.media}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons color="#c33e53" name="leaf-outline" size={26} />
          </View>
        )}
        <Pressable
          accessibilityLabel="Yêu thích"
          onPress={() => toggleLike(product)}
          style={styles.favoriteButton}
        >
          <Ionicons
            color={isFavorite ? "#d9475c" : "#40413f"}
            name={isFavorite ? "heart" : "heart-outline"}
            size={17}
          />
        </Pressable>
      </View>

      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.brand}>
          {product.brand}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>
    </Pressable>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles — Screen
// ─────────────────────────────────────────────────────────────────────────────


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  screen: {
    flex: 1,
    backgroundColor: "#f6f7f5",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  searchBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 12,
    paddingLeft: 15,
    backgroundColor: "#ffffff",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    color: "#252525",
    fontSize: 14,
  },
  filterButton: {
    width: 44,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    borderRadius: 9,
    backgroundColor: "#252525",
  },
  filterButtonActive: {
    backgroundColor: "#c33e53",
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#c33e53",
  },
  // Active filter summary bar
  activeFilterBar: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 2,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f5c0c9",
    backgroundColor: "#fff5f6",
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c33e53",
  },
  activeFilterClearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d9dad6",
    backgroundColor: "#f4f5f2",
  },
  activeFilterClearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666865",
  },
  activeCategoryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#d9dad6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  activeCategoryText: {
    color: "#2d2e2c",
    fontSize: 13,
    fontWeight: "700",
  },
  filterList: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
  },
  filterChip: {
    height: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d9dad6",
    borderRadius: 19,
    paddingHorizontal: 18,
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    borderColor: "#252525",
    backgroundColor: "#252525",
  },
  filterChipText: {
    color: "#666865",
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
  },
  loader: {
    marginVertical: 44,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#e1e2df",
    borderRadius: 16,
    padding: 28,
    backgroundColor: "#ffffff",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: "#f6f7f5",
    marginBottom: 4,
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
  emptyResetBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#252525",
  },
  emptyResetBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#f0bcc4",
    borderRadius: 7,
    padding: 11,
    backgroundColor: "#fff2f4",
  },
  inlineErrorText: {
    flex: 1,
    color: "#9f2639",
    fontSize: 12,
  },
  card: {
    flex: 1,
    maxWidth: "49%",
    marginTop: 14,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 10px rgba(37, 37, 37, 0.06)",
  },
  media: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f1f2ef",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff0f2",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  details: {
    padding: 12,
  },
  brand: {
    color: "#858784",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  name: {
    minHeight: 36,
    marginTop: 5,
    color: "#2d2e2c",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  price: {
    marginTop: 8,
    color: "#252525",
    fontSize: 15,
    fontWeight: "800",
  },
});
