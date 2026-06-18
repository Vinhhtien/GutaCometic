import { Image, StyleSheet, Text, View } from "react-native";
import { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)} VND`;

export function ProductCard({ product }: ProductCardProps) {
  return (
    <View style={styles.card}>
      {product.image ? (
        <Image source={{ uri: product.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>GUTA Cosmetic</Text>
        </View>
      )}
      <View style={styles.details}>
        <Text style={styles.category}>{product.category}</Text>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <View style={styles.tags}>
          {product.skinTypes.slice(0, 3).map((skinType) => (
            <View key={skinType} style={styles.tag}>
              <Text style={styles.tagText}>{skinType}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginBottom: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  image: {
    width: 112,
    minHeight: 148,
    borderRadius: 14,
    backgroundColor: "#fce7f3",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#be185d",
    fontSize: 12,
    fontWeight: "800",
  },
  details: {
    flex: 1,
    paddingLeft: 14,
    paddingVertical: 4,
  },
  category: {
    color: "#db2777",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  name: {
    marginTop: 5,
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  brand: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
  },
  price: {
    marginTop: 9,
    color: "#9f1239",
    fontSize: 15,
    fontWeight: "800",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
  },
  tagText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
  },
});
