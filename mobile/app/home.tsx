import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getErrorMessage } from "@/services/api";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";

const quickMenus = [
  { label: "New arrivals", icon: "sparkles-outline" },
  { label: "Best sellers", icon: "ribbon-outline" },
  { label: "Skin check", icon: "scan-outline" },
  { label: "Stores", icon: "storefront-outline" },
] as const;

const categories = [
  "All",
  "Cleanser",
  "Serum",
  "Moisturizer",
  "Sunscreen",
];

const bottomNavigation = [
  { label: "Home", icon: "home" },
  { label: "Explore", icon: "grid-outline" },
  { label: "Orders", icon: "receipt-outline" },
  { label: "Account", icon: "person-outline" },
] as const;

export default function HomeScreen() {
  const { isLoading, logout, token, user } = useAuth();
  const { itemCount, subtotal } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setError("");
      setProducts(await getProducts(token));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsProductsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = setTimeout(loadProducts, 0);
    return () => clearTimeout(timeoutId);
  }, [loadProducts]);

  if (!isLoading && !user) {
    return <Redirect href="/login" />;
  }

  if (isLoading || !user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#d9475c" />
      </View>
    );
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts();
  };

  const handleAccountPress = () => {
    Alert.alert(user.fullName, user.email, [
      { text: "Close", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <FlatList
        columnWrapperStyle={products.length > 0 ? styles.productRow : undefined}
        contentContainerStyle={styles.content}
        data={products}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          isProductsLoading ? (
            <ActivityIndicator
              style={styles.loader}
              color="#d9475c"
              size="large"
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons color="#d9475c" name="bag-handle-outline" size={26} />
              </View>
              <Text style={styles.emptyTitle}>
                {error ? "Unable to load products" : "Products are coming soon"}
              </Text>
              <Text style={styles.emptyMessage}>
                {error ||
                  "The catalog UI is ready. Add products to MongoDB to display them here."}
              </Text>
              <Pressable onPress={loadProducts} style={styles.retryButton}>
                <Ionicons color="#ffffff" name="refresh" size={17} />
                <Text style={styles.retryText}>Refresh catalog</Text>
              </Pressable>
            </View>
          )
        }
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <View style={styles.brandBlock}>
                <Text style={styles.brand}>GUTA</Text>
                <Text style={styles.brandSubline}>COSMETIC</Text>
              </View>

              <View style={styles.topActions}>
                <Pressable accessibilityLabel="Notifications" style={styles.iconButton}>
                  <Ionicons color="#252525" name="notifications-outline" size={22} />
                  <View style={styles.notificationDot} />
                </Pressable>
                <Pressable onPress={handleAccountPress} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.fullName.trim().charAt(0).toUpperCase()}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.hello}>Hello, {user.fullName.split(" ")[0]}</Text>
              <Text style={styles.welcomeCopy}>
                Find the right care for your skin today.
              </Text>
            </View>

            <View style={styles.searchBar}>
              <Ionicons color="#767676" name="search-outline" size={21} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search products, brands..."
                placeholderTextColor="#8f8f8f"
                style={styles.searchInput}
                value={query}
              />
              <Pressable accessibilityLabel="Filters" style={styles.filterButton}>
                <Ionicons color="#ffffff" name="options-outline" size={20} />
              </Pressable>
            </View>

            <ImageBackground
              imageStyle={styles.bannerImage}
              source={require("@/assets/images/guta-home-banner.png")}
              style={styles.banner}
            >
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerEyebrow}>WEEKLY EDIT</Text>
                <Text style={styles.bannerTitle}>Healthy skin starts here</Text>
                <Text style={styles.bannerCopy}>
                  Build a simple routine made for your skin.
                </Text>
                <Pressable style={styles.bannerButton}>
                  <Text style={styles.bannerButtonText}>Explore now</Text>
                  <Ionicons color="#ffffff" name="arrow-forward" size={15} />
                </Pressable>
              </View>
            </ImageBackground>

            <View style={styles.quickMenu}>
              {quickMenus.map((item) => (
                <Pressable key={item.label} style={styles.quickMenuItem}>
                  <View style={styles.quickMenuIcon}>
                    <Ionicons color="#c33e53" name={item.icon} size={22} />
                  </View>
                  <Text numberOfLines={2} style={styles.quickMenuLabel}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Shop by category</Text>
                <Text style={styles.sectionCaption}>Essentials for every routine</Text>
              </View>
              <Text style={styles.seeAll}>View all</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.categoryList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {categories.map((category) => {
                const isActive = activeCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.productHeading}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>
              <Text style={styles.productCount}>{products.length} items</Text>
            </View>

            {error && products.length > 0 ? (
              <View style={styles.inlineError}>
                <Ionicons color="#b4233a" name="alert-circle-outline" size={18} />
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        numColumns={2}
        refreshControl={
          <RefreshControl
            colors={["#d9475c"]}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            tintColor="#d9475c"
          />
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        showsVerticalScrollIndicator={false}
        style={styles.screen}
      />

      <View style={styles.bottomDock}>
        {itemCount > 0 ? (
          <Pressable style={styles.cartBar}>
            <View style={styles.cartIconWrap}>
              <Ionicons color="#ffffff" name="bag-handle" size={21} />
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{itemCount}</Text>
              </View>
            </View>
            <View style={styles.cartDetails}>
              <Text style={styles.cartLabel}>Your cart</Text>
              <Text style={styles.cartValue}>
                {new Intl.NumberFormat("vi-VN").format(subtotal)} VND
              </Text>
            </View>
            <Ionicons color="#ffffff" name="chevron-up" size={20} />
          </Pressable>
        ) : null}

        <View style={styles.bottomNavigation}>
          {bottomNavigation.map((item, index) => {
            const isActive = index === 0;

            return (
              <Pressable key={item.label} style={styles.navItem}>
                <Ionicons
                  color={isActive ? "#d9475c" : "#8c8c8c"}
                  name={item.icon}
                  size={22}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
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
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 150,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 18,
  },
  brandBlock: {
    minWidth: 82,
  },
  brand: {
    color: "#252525",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  brandSubline: {
    marginTop: -2,
    color: "#d9475c",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e7e7e4",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    borderRadius: 4,
    backgroundColor: "#d9475c",
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2d5a4b",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  welcomeBlock: {
    marginBottom: 18,
  },
  hello: {
    color: "#252525",
    fontSize: 25,
    fontWeight: "800",
  },
  welcomeCopy: {
    marginTop: 4,
    color: "#6f716e",
    fontSize: 14,
    lineHeight: 20,
  },
  searchBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 8,
    paddingLeft: 15,
    backgroundColor: "#ffffff",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    color: "#252525",
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    borderRadius: 6,
    backgroundColor: "#252525",
  },
  banner: {
    height: 180,
    justifyContent: "center",
    marginTop: 20,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#edf1ed",
  },
  bannerImage: {
    borderRadius: 8,
  },
  bannerOverlay: {
    width: "58%",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  bannerEyebrow: {
    color: "#c33e53",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  bannerTitle: {
    marginTop: 7,
    color: "#222222",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  bannerCopy: {
    marginTop: 7,
    color: "#60625f",
    fontSize: 12,
    lineHeight: 17,
  },
  bannerButton: {
    width: 112,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 13,
    borderRadius: 6,
    backgroundColor: "#d9475c",
  },
  bannerButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  quickMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e4e5e1",
  },
  quickMenuItem: {
    width: "24%",
    alignItems: "center",
  },
  quickMenuIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fff0f2",
  },
  quickMenuLabel: {
    marginTop: 8,
    color: "#3d3e3c",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 26,
  },
  sectionTitle: {
    color: "#252525",
    fontSize: 19,
    fontWeight: "800",
  },
  sectionCaption: {
    marginTop: 3,
    color: "#81837f",
    fontSize: 12,
  },
  seeAll: {
    color: "#c33e53",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryList: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 4,
  },
  categoryChip: {
    height: 37,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d9dad6",
    borderRadius: 7,
    paddingHorizontal: 15,
    backgroundColor: "#ffffff",
  },
  categoryChipActive: {
    borderColor: "#252525",
    backgroundColor: "#252525",
  },
  categoryText: {
    color: "#666865",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: "#ffffff",
  },
  productHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 13,
  },
  productCount: {
    color: "#858784",
    fontSize: 12,
  },
  productRow: {
    justifyContent: "space-between",
    gap: 12,
  },
  loader: {
    marginVertical: 44,
  },
  emptyState: {
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e1e2df",
    borderRadius: 8,
    padding: 25,
    backgroundColor: "#ffffff",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fff0f2",
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
  retryButton: {
    height: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    borderRadius: 6,
    paddingHorizontal: 16,
    backgroundColor: "#d9475c",
  },
  retryText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
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
  bottomDock: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  cartBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: "#2d5a4b",
  },
  cartIconWrap: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  cartCount: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2d5a4b",
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: "#d9475c",
  },
  cartCountText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  cartDetails: {
    flex: 1,
    marginLeft: 10,
  },
  cartLabel: {
    color: "#cfe0d9",
    fontSize: 11,
    fontWeight: "700",
  },
  cartValue: {
    marginTop: 2,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomNavigation: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#dedfdb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    boxShadow: "0 3px 12px rgba(37, 37, 37, 0.08)",
  },
  navItem: {
    width: "24%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    marginTop: 4,
    color: "#8c8c8c",
    fontSize: 10,
    fontWeight: "700",
  },
  navLabelActive: {
    color: "#d9475c",
  },
});
