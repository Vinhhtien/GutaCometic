import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import {
  createOwnerProduct,
  getOwnerProducts,
  updateOwnerProduct,
} from "@/services/ownerService";
import { OwnerProduct } from "@/types/owner";

type ProductFormState = {
  brand: string;
  category: string;
  costPrice: string;
  description: string;
  expiryDate: string;
  image: string;
  name: string;
  originalPrice: string;
  origin: string;
  price: string;
  skinTypes: string;
  sku: string;
  volume: string;
};

const EMPTY_FORM: ProductFormState = {
  brand: "",
  category: "",
  costPrice: "",
  description: "",
  expiryDate: "",
  image: "",
  name: "",
  originalPrice: "",
  origin: "",
  price: "",
  skinTypes: "",
  sku: "",
  volume: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export default function OwnerProductsScreen() {
  const { token } = useAuth();
  const [products, setProducts] = useState<OwnerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OwnerProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const loadProducts = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        if (mode === "refresh") {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const nextProducts = await getOwnerProducts(token, { includeInactive: true });
        setProducts(nextProducts);
      } catch (error) {
        Alert.alert("Không tải được sản phẩm", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.sku, product.brand, product.category]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [products, search]);

  const openCreateModal = () => {
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
    setIsModalVisible(true);
  };

  const openEditModal = (product: OwnerProduct) => {
    setSelectedProduct(product);
    setForm({
      brand: product.brand,
      category: product.category,
      costPrice:
        product.costPrice === null || product.costPrice === undefined
          ? ""
          : String(product.costPrice),
      description: product.description || "",
      expiryDate: product.expiryDate || "",
      image: product.image || "",
      name: product.name,
      originalPrice:
        product.originalPrice === null || product.originalPrice === undefined
          ? ""
          : String(product.originalPrice),
      origin: product.origin || "",
      price: String(product.price),
      skinTypes: (product.skinTypes || []).join(", "),
      sku: product.sku,
      volume: product.volume || "",
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
  };

  const handleToggleActive = async (product: OwnerProduct) => {
    if (!token) {
      return;
    }

    try {
      const updated = await updateOwnerProduct(token, product._id, {
        isActive: !product.isActive,
      });
      setProducts((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
    } catch (error) {
      Alert.alert("Không cập nhật được trạng thái", getErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }

    if (!form.sku || !form.name || !form.brand || !form.category || !form.price) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đủ SKU, tên, hãng, loại và giá bán."
      );
      return;
    }

    const payload = {
      brand: form.brand,
      category: form.category,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      description: form.description,
      expiryDate: form.expiryDate,
      image: form.image,
      name: form.name,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      origin: form.origin,
      price: Number(form.price),
      skinTypes: form.skinTypes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      sku: form.sku,
      volume: form.volume,
    };

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      Alert.alert("Giá bán không hợp lệ", "Vui lòng nhập giá bán >= 0.");
      return;
    }

    if (
      payload.costPrice !== null &&
      (!Number.isFinite(payload.costPrice) || payload.costPrice < 0)
    ) {
      Alert.alert("Giá vốn không hợp lệ", "Vui lòng nhập giá vốn >= 0.");
      return;
    }

    try {
      setIsSaving(true);

      if (selectedProduct) {
        const updated = await updateOwnerProduct(token, selectedProduct._id, payload);
        setProducts((current) =>
          current.map((item) => (item._id === updated._id ? updated : item))
        );
      } else {
        const created = await createOwnerProduct(token, payload);
        setProducts((current) => [created, ...current]);
      }

      closeModal();
    } catch (error) {
      Alert.alert("Không lưu được sản phẩm", getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PRODUCT OWNER</Text>
          <Text style={styles.title}>Sản phẩm & giá</Text>
          <Text style={styles.subtitle}>Quản lý sản phẩm toàn chuỗi</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải danh sách sản phẩm...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadProducts("refresh")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Ionicons color="#69756f" name="search-outline" size={18} />
              <TextInput
                onChangeText={setSearch}
                placeholder="Tìm theo tên, SKU, hãng..."
                placeholderTextColor="#8a948f"
                style={styles.searchInput}
                value={search}
              />
            </View>
            <Pressable onPress={openCreateModal} style={styles.primaryAction}>
              <Ionicons color="#ffffff" name="add" size={18} />
              <Text style={styles.primaryActionText}>Tạo mới</Text>
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <SummaryCard
              label="Đang kinh doanh"
              value={String(products.filter((item) => item.isActive).length)}
            />
            <SummaryCard
              label="Tạm ẩn"
              value={String(products.filter((item) => !item.isActive).length)}
            />
          </View>

          <View style={styles.cardList}>
            {filteredProducts.map((product) => (
              <View key={product._id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productTitleBox}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      {product.sku} · {product.brand} · {product.category}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      product.isActive ? styles.statusPillActive : styles.statusPillMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        product.isActive ? styles.statusTextActive : styles.statusTextMuted,
                      ]}
                    >
                      {product.isActive ? "Đang bán" : "Tạm ẩn"}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>{formatCurrency(product.price)}</Text>
                  {product.originalPrice ? (
                    <Text style={styles.originalPriceText}>
                      {formatCurrency(product.originalPrice)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.costPriceText}>
                  Giá vốn:{" "}
                  {typeof product.costPrice === "number"
                    ? formatCurrency(product.costPrice)
                    : "Chưa thiết lập"}
                </Text>

                <Text numberOfLines={2} style={styles.descriptionText}>
                  {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => openEditModal(product)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Chỉnh sửa</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleToggleActive(product)}
                    style={[
                      styles.secondaryButton,
                      !product.isActive && styles.secondaryButtonDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        !product.isActive && styles.secondaryButtonDangerText,
                      ]}
                    >
                      {product.isActive ? "Tạm ẩn" : "Mở lại"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm mới"}
              </Text>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <Ionicons color="#252525" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input
                label="SKU"
                value={form.sku}
                onChangeText={(value) => setForm((current) => ({ ...current, sku: value }))}
              />
              <Input
                label="Tên sản phẩm"
                value={form.name}
                onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
              />
              <Input
                label="Thương hiệu"
                value={form.brand}
                onChangeText={(value) => setForm((current) => ({ ...current, brand: value }))}
              />
              <Input
                label="Danh mục"
                value={form.category}
                onChangeText={(value) => setForm((current) => ({ ...current, category: value }))}
              />
              <Input
                label="Giá bán"
                keyboardType="number-pad"
                value={form.price}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    price: value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
              <Input
                label="Giá gốc (nếu có)"
                keyboardType="number-pad"
                value={form.originalPrice}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    originalPrice: value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
              <Input
                label="Giá vốn / giá nhập"
                keyboardType="number-pad"
                value={form.costPrice}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    costPrice: value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
              <Input
                label="Loại da (tách dấu phẩy)"
                value={form.skinTypes}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, skinTypes: value }))
                }
              />
              <Input
                label="Dung tích"
                value={form.volume}
                onChangeText={(value) => setForm((current) => ({ ...current, volume: value }))}
              />
              <Input
                label="Xuất xứ"
                value={form.origin}
                onChangeText={(value) => setForm((current) => ({ ...current, origin: value }))}
              />
              <Input
                label="Hạn sử dụng"
                value={form.expiryDate}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, expiryDate: value }))
                }
              />
              <Input
                label="Link ảnh"
                value={form.image}
                onChangeText={(value) => setForm((current) => ({ ...current, image: value }))}
              />
              <Input
                label="Mô tả"
                multiline
                value={form.description}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, description: value }))
                }
              />

              <Pressable disabled={isSaving} onPress={handleSubmit} style={styles.submitButton}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedProduct ? "Lưu cập nhật" : "Tạo sản phẩm"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Input({
  label,
  multiline,
  onChangeText,
  value,
  keyboardType,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#8a948f"
        style={[styles.input, multiline && styles.textArea]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { color: "#1f2522", fontSize: 23, fontWeight: "900" },
  subtitle: { marginTop: 3, color: "#69756f", fontSize: 13, fontWeight: "700" },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  toolbar: { gap: 10 },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryAction: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryActionText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  summaryCard: {
    flex: 1,
    minHeight: 78,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  summaryValue: { color: "#1f2522", fontSize: 22, fontWeight: "900" },
  summaryLabel: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "800" },
  cardList: { gap: 10, marginTop: 14 },
  productCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  productHeader: { flexDirection: "row", gap: 10 },
  productTitleBox: { flex: 1, minWidth: 0 },
  productName: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  productMeta: { marginTop: 4, color: "#69756f", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  statusPill: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusPillActive: { backgroundColor: "#eef4ef" },
  statusPillMuted: { backgroundColor: "#fff1f3" },
  statusText: { fontSize: 11, fontWeight: "900" },
  statusTextActive: { color: "#2d5a4b" },
  statusTextMuted: { color: "#9f2639" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  priceText: { color: "#1f2522", fontSize: 18, fontWeight: "900" },
  originalPriceText: {
    color: "#8a948f",
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "line-through",
  },
  costPriceText: {
    marginTop: 6,
    color: "#52605a",
    fontSize: 12,
    fontWeight: "800",
  },
  descriptionText: {
    marginTop: 8,
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9dfd8",
  },
  secondaryButtonDanger: {
    backgroundColor: "#fff1f3",
    borderColor: "#f1c5cd",
  },
  secondaryButtonText: { color: "#252525", fontSize: 13, fontWeight: "900" },
  secondaryButtonDangerText: { color: "#9f2639" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheet: {
    maxHeight: "92%",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#ffffff",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { color: "#1f2522", fontSize: 18, fontWeight: "900" },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#f1f4ef",
  },
  inputGroup: { marginBottom: 10 },
  inputLabel: { marginBottom: 6, color: "#52605a", fontSize: 12, fontWeight: "900" },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
    color: "#1f2522",
    fontWeight: "800",
  },
  textArea: { minHeight: 92, paddingTop: 12 },
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  submitButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
});
