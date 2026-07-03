import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWishlist } from "@/contexts/WishlistContext";
import { Product } from "@/types/product";

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function WishlistScreen() {
  const { isLoading, products, toggleLike } = useWishlist();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Sản phẩm yêu thích</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#252525" size="large" style={styles.loader} />
      ) : (
        <FlatList
          columnWrapperStyle={products.length > 0 ? styles.row : undefined}
          contentContainerStyle={styles.content}
          data={products}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons color="#d9d9d7" name="heart" size={72} />
              <Text style={styles.emptyTitle}>
                Danh sách yêu thích của bạn còn trống
              </Text>
              <Pressable
                onPress={() => router.push("/customer/(tabs)/category")}
                style={styles.exploreButton}
              >
                <Text style={styles.exploreButtonText}>Khám phá ngay</Text>
              </Pressable>
            </View>
          }
          numColumns={2}
          renderItem={({ item }) => (
            <WishlistCard onRemove={toggleLike} product={item} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function WishlistCard({
  onRemove,
  product,
}: {
  onRemove: (product: Product) => void;
  product: Product;
}) {
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
          accessibilityLabel="Bỏ yêu thích"
          onPress={() => onRemove(product)}
          style={styles.favoriteButton}
        >
          <Ionicons color="#d9475c" name="heart" size={17} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  loader: {
    marginTop: 60,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
  },
  emptyState: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    marginTop: 18,
    color: "#9a9c98",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  exploreButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: "#252525",
  },
  exploreButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
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
