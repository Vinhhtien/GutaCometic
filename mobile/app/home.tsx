import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";

export default function HomeScreen() {
  const { isLoading, logout, token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setError("");
      const result = await getProducts(token);
      setProducts(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsProductsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadProducts]);

  if (!isLoading && !user) {
    return <Redirect href="/login" />;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts();
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={products}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={
        isProductsLoading ? (
          <ActivityIndicator style={styles.loader} color="#db2777" size="large" />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {error ? "Products could not be loaded" : "No products yet"}
            </Text>
            <Text style={styles.emptyMessage}>
              {error || "Run the backend seed command to add demo products."}
            </Text>
            <Pressable onPress={loadProducts} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )
      }
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <View style={styles.brandBlock}>
              <Text style={styles.brand}>GUTA Cosmetic</Text>
              <Text style={styles.greeting}>Hello, {user.fullName}</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>SIGNED IN AS</Text>
            <Text style={styles.profileName}>{user.fullName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Skincare picks</Text>
            <Text style={styles.sectionCount}>{products.length} products</Text>
          </View>

          {error && products.length > 0 ? (
            <Text style={styles.inlineError}>{error}</Text>
          ) : null}
        </>
      }
      refreshControl={
        <RefreshControl
          colors={["#db2777"]}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          tintColor="#db2777"
        />
      }
      renderItem={({ item }) => <ProductCard product={item} />}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brandBlock: {
    flex: 1,
  },
  brand: {
    color: "#db2777",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  greeting: {
    marginTop: 4,
    color: "#172033",
    fontSize: 24,
    fontWeight: "800",
  },
  logoutButton: {
    marginLeft: 16,
    borderWidth: 1,
    borderColor: "#fbcfe8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  logoutText: {
    color: "#be185d",
    fontWeight: "700",
  },
  profileCard: {
    marginBottom: 28,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#831843",
  },
  profileLabel: {
    color: "#fbcfe8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  profileName: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  profileEmail: {
    marginTop: 4,
    color: "#fce7f3",
    fontSize: 14,
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
  },
  roleText: {
    color: "#831843",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "800",
  },
  sectionCount: {
    color: "#64748b",
    fontSize: 13,
  },
  inlineError: {
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
    color: "#9f1239",
    backgroundColor: "#fff1f2",
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 20,
    borderRadius: 18,
    padding: 24,
    backgroundColor: "#ffffff",
  },
  emptyTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyMessage: {
    marginTop: 8,
    color: "#64748b",
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#db2777",
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
