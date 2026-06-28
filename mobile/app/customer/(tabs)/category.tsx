import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { getErrorMessage } from "@/services/api";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";

const skinTypeFilters = [
  { label: "Tất cả", value: "" },
  { label: "Da dầu", value: "Da dầu" },
  { label: "Da khô", value: "Da khô" },
  { label: "Da nhạy cảm", value: "Da nhạy cảm" },
  { label: "Da mụn", value: "Da mụn" },
  { label: "Da lão hóa", value: "Da lão hóa" },
  { label: "Da thường", value: "Da thường" },
];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function CategoryScreen() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [skinType, setSkinType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSearch(searchText.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText]);

  const loadProducts = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setError("");
      setProducts(await getProducts(token, { search, skinType }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, search, skinType]);

  useEffect(() => {
    setIsLoading(true);
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts();
  };

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
              <Ionicons color="#9b9d99" name="search-outline" size={28} />
              <Text style={styles.emptyTitle}>
                {error ? "Không thể tải sản phẩm" : "Không tìm thấy sản phẩm"}
              </Text>
              <Text style={styles.emptyMessage}>
                {error || "Hãy thử thay đổi từ khóa hoặc bộ lọc loại da."}
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          <>
            <View style={styles.searchBar}>
              <Ionicons color="#767676" name="search-outline" size={20} />
              <TextInput
                onChangeText={setSearchText}
                placeholder="Tìm kiếm sản phẩm chăm sóc da..."
                placeholderTextColor="#8f8f8f"
                style={styles.searchInput}
                value={searchText}
              />
              <Pressable accessibilityLabel="Bộ lọc" style={styles.filterButton}>
                <Ionicons color="#ffffff" name="options-outline" size={19} />
              </Pressable>
            </View>

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

function ProductGridCard({ product }: { product: Product }) {
  const [isFavorite, setIsFavorite] = useState(false);

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
          onPress={() => setIsFavorite((prev) => !prev)}
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
    borderRadius: 8,
    padding: 25,
    backgroundColor: "#ffffff",
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
