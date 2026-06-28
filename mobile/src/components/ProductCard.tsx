import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)} VND`;

export function ProductCard({ product }: ProductCardProps) {
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
            <Ionicons color="#c33e53" name="leaf-outline" size={29} />
            <Text style={styles.placeholderText}>GUTA</Text>
          </View>
        )}
        <Pressable accessibilityLabel="Save product" style={styles.favoriteButton}>
          <Ionicons color="#40413f" name="heart-outline" size={18} />
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

        <View style={styles.cardFooter}>
          <Text numberOfLines={1} style={styles.category}>
            {product.category}
          </Text>
          <Pressable accessibilityLabel="Add product" style={styles.addButton}>
            <Ionicons color="#ffffff" name="add" size={19} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: "49%",
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e1e2df",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  media: {
    position: "relative",
    width: "100%",
    aspectRatio: 0.92,
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
    gap: 5,
    backgroundColor: "#fff0f2",
  },
  placeholderText: {
    color: "#a93447",
    fontSize: 11,
    fontWeight: "900",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  details: {
    minHeight: 142,
    padding: 11,
  },
  brand: {
    color: "#858784",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  name: {
    minHeight: 38,
    marginTop: 5,
    color: "#2d2e2c",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  price: {
    marginTop: 8,
    color: "#c33e53",
    fontSize: 13,
    fontWeight: "900",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  category: {
    flex: 1,
    marginRight: 8,
    color: "#6c6e6b",
    fontSize: 10,
    fontWeight: "700",
  },
  addButton: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#252525",
  },
});
