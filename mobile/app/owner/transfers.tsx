import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { getProductInventory } from "@/services/inventoryService";
import {
  cancelOwnerTransfer,
  createOwnerTransfer,
  getOwnerStores,
  getOwnerTransfers,
} from "@/services/ownerService";
import { ProductInventory } from "@/types/inventory";
import { ManagedStore, OwnerTransfer } from "@/types/owner";

type TransferItemDraft = {
  productId: string;
  productName: string;
  quantity: string;
};

const getStoreInventory = (entry: ProductInventory, storeId: string) =>
  entry.inventories.find((inventory) => inventory.store._id === storeId);

const getStoreAvailableStock = (entry: ProductInventory, storeId: string) =>
  getStoreInventory(entry, storeId)?.availableStock || 0;

const getTotalAvailableForStore = (
  inventoryProducts: ProductInventory[],
  storeId: string
) =>
  inventoryProducts.reduce(
    (sum, entry) => sum + getStoreAvailableStock(entry, storeId),
    0
  );

const pickPreferredSourceStoreId = (
  nextStores: ManagedStore[],
  nextProducts: ProductInventory[],
  currentStoreId: string
) => {
  if (currentStoreId && nextStores.some((store) => store._id === currentStoreId)) {
    return currentStoreId;
  }

  const centralWithStock = nextStores.find(
    (store) =>
      store.type === "CENTRAL" &&
      getTotalAvailableForStore(nextProducts, store._id) > 0
  );

  if (centralWithStock) {
    return centralWithStock._id;
  }

  const storeWithStock = nextStores.find(
    (store) => getTotalAvailableForStore(nextProducts, store._id) > 0
  );

  if (storeWithStock) {
    return storeWithStock._id;
  }

  return (
    nextStores.find((store) => store.type === "CENTRAL")?._id ||
    nextStores[0]?._id ||
    ""
  );
};

export default function OwnerTransfersScreen() {
  const { token } = useAuth();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [transfers, setTransfers] = useState<OwnerTransfer[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED"
  >("ALL");
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TransferItemDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const loadData = useCallback(
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
        const [nextStores, nextProducts, nextTransfers] = await Promise.all([
          getOwnerStores(token, false),
          getProductInventory(token, { limit: 100 }),
          getOwnerTransfers(token, { status: statusFilter }),
        ]);

        const nextFromStoreId = pickPreferredSourceStoreId(
          nextStores,
          nextProducts,
          fromStoreId
        );
        const nextToStoreId =
          toStoreId &&
          toStoreId !== nextFromStoreId &&
          nextStores.some((store) => store._id === toStoreId)
            ? toStoreId
            : nextStores.find((store) => store._id !== nextFromStoreId)?._id || "";

        setStores(nextStores);
        setProducts(nextProducts);
        setTransfers(nextTransfers);
        setFromStoreId(nextFromStoreId);
        setToStoreId(nextToStoreId);
      } catch (error) {
        Alert.alert("Không tải được điều chuyển", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fromStoreId, statusFilter, toStoreId, token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!fromStoreId || !stores.length) {
      return;
    }

    if (toStoreId && toStoreId !== fromStoreId) {
      return;
    }

    const fallbackStoreId =
      stores.find((store) => store._id !== fromStoreId)?._id || "";

    if (fallbackStoreId !== toStoreId) {
      setToStoreId(fallbackStoreId);
    }
  }, [fromStoreId, stores, toStoreId]);

  const sourceStore = useMemo(
    () => stores.find((store) => store._id === fromStoreId) || null,
    [fromStoreId, stores]
  );

  const availableProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((entry) => {
      const availableStock = getStoreAvailableStock(entry, fromStoreId);

      if (availableStock <= 0) {
        return false;
      }

      if (items.some((item) => item.productId === entry.product._id)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [entry.product.name, entry.product.sku, entry.product.brand]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [fromStoreId, items, products, search]);

  const sourceStoreStock = useMemo(
    () => getTotalAvailableForStore(products, fromStoreId),
    [fromStoreId, products]
  );

  const handleAddItem = (entry: ProductInventory) => {
    setItems((current) => [
      ...current,
      {
        productId: entry.product._id,
        productName: entry.product.name,
        quantity: "1",
      },
    ]);
    setSearch("");
    setIsPickerVisible(false);
  };

  const handleCreateTransfer = async () => {
    if (!token) {
      return;
    }

    if (!fromStoreId || !toStoreId || fromStoreId === toStoreId) {
      Alert.alert("Chưa chọn đúng kho", "Vui lòng chọn kho nguồn và kho đích khác nhau.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Chưa có sản phẩm", "Hãy thêm ít nhất một sản phẩm vào phiếu điều chuyển.");
      return;
    }

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number.parseInt(item.quantity, 10),
    }));

    if (
      normalizedItems.some(
        (item) => !Number.isInteger(item.quantity) || item.quantity <= 0
      )
    ) {
      Alert.alert("Số lượng không hợp lệ", "Mỗi sản phẩm cần có số lượng lớn hơn 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createOwnerTransfer(token, {
        fromStoreId,
        items: normalizedItems,
        toStoreId,
      });
      setTransfers((current) => [created, ...current]);
      setItems([]);
      await loadData("refresh");
      Alert.alert("Đã tạo phiếu", "Phiếu điều chuyển đã được lưu và trừ tồn kho nguồn.");
    } catch (error) {
      Alert.alert("Không tạo được phiếu", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTransfer = async (transfer: OwnerTransfer) => {
    if (!token || processingId) {
      return;
    }

    try {
      setProcessingId(transfer._id);
      const updated = await cancelOwnerTransfer(token, transfer._id);
      setTransfers((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      await loadData("refresh");
    } catch (error) {
      Alert.alert("Không hủy được phiếu", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>STOCK TRANSFER</Text>
          <Text style={styles.title}>Tạo & theo dõi điều chuyển</Text>
          <Text style={styles.subtitle}>
            Phiếu tạo ở đây sẽ được nhận ở màn tồn kho của cửa hàng đích
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải phiếu điều chuyển...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadData("refresh")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tạo phiếu mới</Text>

            <Text style={styles.inputLabel}>Kho nguồn</Text>
            <View style={styles.storeList}>
              {stores.map((store) => {
                const active = fromStoreId === store._id;

                return (
                  <Pressable
                    key={`from-${store._id}`}
                    onPress={() => setFromStoreId(store._id)}
                    style={[styles.storeChip, active && styles.storeChipActive]}
                  >
                    <Text
                      style={[
                        styles.storeChipText,
                        active && styles.storeChipTextActive,
                      ]}
                    >
                      {store.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sourceNotice}>
              <Ionicons color="#2d5a4b" name="information-circle-outline" size={18} />
              <Text style={styles.sourceNoticeText}>
                {sourceStore
                  ? `${sourceStore.name} hiện còn ${sourceStoreStock} sản phẩm khả dụng để điều chuyển.`
                  : "Chọn kho nguồn để bắt đầu điều chuyển."}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Kho đích</Text>
            <View style={styles.storeList}>
              {stores.map((store) => {
                const active = toStoreId === store._id;
                const disabled = store._id === fromStoreId;

                return (
                  <Pressable
                    key={`to-${store._id}`}
                    disabled={disabled}
                    onPress={() => setToStoreId(store._id)}
                    style={[
                      styles.storeChip,
                      active && styles.storeChipActive,
                      disabled && styles.storeChipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.storeChipText,
                        active && styles.storeChipTextActive,
                        disabled && styles.storeChipTextDisabled,
                      ]}
                    >
                      {store.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setIsPickerVisible(true)}
              style={styles.secondaryButton}
            >
              <Ionicons color="#252525" name="add-circle-outline" size={18} />
              <Text style={styles.secondaryButtonText}>Thêm sản phẩm vào phiếu</Text>
            </Pressable>

            <View style={styles.itemList}>
              {items.length === 0 ? (
                <Text style={styles.emptyInlineText}>
                  Chưa có sản phẩm nào trong phiếu.
                </Text>
              ) : (
                items.map((item) => (
                  <View key={item.productId} style={styles.itemCard}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.cardTitle}>{item.productName}</Text>
                    </View>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) =>
                        setItems((current) =>
                          current.map((entry) =>
                            entry.productId === item.productId
                              ? {
                                  ...entry,
                                  quantity: value.replace(/[^0-9]/g, ""),
                                }
                              : entry
                          )
                        )
                      }
                      style={styles.quantityInput}
                      value={item.quantity}
                    />
                    <Pressable
                      onPress={() =>
                        setItems((current) =>
                          current.filter((entry) => entry.productId !== item.productId)
                        )
                      }
                    >
                      <Ionicons color="#9f2639" name="trash-outline" size={18} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={handleCreateTransfer}
              style={styles.primaryButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Tạo phiếu điều chuyển</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Theo dõi phiếu đã tạo</Text>
          <View style={styles.filterRow}>
            {(["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const).map((status) => {
              const active = statusFilter === status;

              return (
                <Pressable
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.cardList}>
            {transfers.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>
                  Không có phiếu điều chuyển theo bộ lọc hiện tại.
                </Text>
              </View>
            ) : (
              transfers.map((transfer) => (
                <View key={transfer._id} style={styles.transferCard}>
                  <View style={styles.transferHeader}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.cardTitle}>
                        {transfer.fromStoreId.name} → {transfer.toStoreId.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {transfer.items.length} sản phẩm · {transfer.status}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        transfer.status === "CONFIRMED"
                          ? styles.statusPillSuccess
                          : transfer.status === "CANCELLED"
                            ? styles.statusPillDanger
                            : styles.statusPillPending,
                      ]}
                    >
                      <Text style={styles.statusText}>{transfer.status}</Text>
                    </View>
                  </View>

                  {transfer.items.slice(0, 4).map((item) => (
                    <Text key={item.productId._id} style={styles.itemText}>
                      {item.productId.name} x{item.quantity}
                    </Text>
                  ))}

                  {transfer.status === "PENDING" ? (
                    <Pressable
                      disabled={processingId === transfer._id}
                      onPress={() => handleCancelTransfer(transfer)}
                      style={styles.cancelButton}
                    >
                      {processingId === transfer._id ? (
                        <ActivityIndicator color="#9f2639" />
                      ) : (
                        <Text style={styles.cancelButtonText}>
                          Hủy phiếu và hoàn tồn kho nguồn
                        </Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent visible={isPickerVisible}>
        <Pressable onPress={Keyboard.dismiss} style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetWrapper}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={styles.sheet}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Chọn sản phẩm điều chuyển</Text>
                <Pressable
                  onPress={() => setIsPickerVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons color="#252525" name="close" size={20} />
                </Pressable>
              </View>

              <View style={styles.searchBox}>
                <Ionicons color="#69756f" name="search-outline" size={18} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Tìm sản phẩm ở kho nguồn..."
                  placeholderTextColor="#8a948f"
                  style={styles.searchInput}
                  value={search}
                />
              </View>

              <ScrollView
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.cardList}>
                  {availableProducts.length === 0 ? (
                    <View style={styles.emptyPanel}>
                      <Text style={styles.emptyText}>
                        {sourceStore
                          ? `Kho nguồn ${sourceStore.name} hiện chưa có sản phẩm khả dụng để điều chuyển.`
                          : "Hãy chọn kho nguồn trước khi thêm sản phẩm."}
                      </Text>
                    </View>
                  ) : (
                    availableProducts.map((entry) => {
                      const sourceInventory = getStoreInventory(entry, fromStoreId);

                      return (
                        <Pressable
                          key={entry.product._id}
                          onPress={() => handleAddItem(entry)}
                          style={styles.productPickerCard}
                        >
                          <Text style={styles.cardTitle}>{entry.product.name}</Text>
                          <Text style={styles.cardMeta}>
                            {entry.product.brand} · Còn{" "}
                            {sourceInventory?.availableStock || 0}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
  sectionCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  sectionTitle: { marginBottom: 10, color: "#1f2522", fontSize: 16, fontWeight: "900" },
  inputLabel: { marginTop: 12, marginBottom: 6, color: "#52605a", fontSize: 12, fontWeight: "900" },
  storeList: { gap: 8 },
  storeChip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeChipActive: {
    backgroundColor: "#eef4ef",
    borderColor: "#9fb8ad",
  },
  storeChipDisabled: {
    opacity: 0.45,
  },
  storeChipText: { color: "#52605a", fontSize: 12, fontWeight: "800" },
  storeChipTextActive: { color: "#2d5a4b" },
  storeChipTextDisabled: { color: "#87918c" },
  sourceNotice: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
    borderWidth: 1,
    borderColor: "#d9e4dc",
  },
  sourceNoticeText: {
    flex: 1,
    color: "#2d5a4b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  secondaryButtonText: { color: "#252525", fontSize: 13, fontWeight: "900" },
  itemList: { gap: 8, marginTop: 12 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  itemCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  cardMeta: { marginTop: 4, color: "#69756f", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  quantityInput: {
    width: 62,
    minHeight: 40,
    textAlign: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9dfd8",
    color: "#1f2522",
    fontWeight: "800",
  },
  emptyInlineText: { color: "#69756f", fontSize: 12, fontWeight: "700" },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10, marginTop: 8 },
  filterChip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  filterChipActive: { backgroundColor: "#252525", borderColor: "#252525" },
  filterChipText: { color: "#52605a", fontSize: 12, fontWeight: "900" },
  filterChipTextActive: { color: "#ffffff" },
  cardList: { gap: 10 },
  transferCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  transferHeader: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statusPill: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusPillPending: { backgroundColor: "#fff7eb" },
  statusPillSuccess: { backgroundColor: "#eef4ef" },
  statusPillDanger: { backgroundColor: "#fff1f3" },
  statusText: { color: "#252525", fontSize: 10, fontWeight: "900" },
  itemText: { color: "#52605a", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  cancelButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#fff1f3",
    borderWidth: 1,
    borderColor: "#f1c5cd",
  },
  cancelButtonText: { color: "#9f2639", fontSize: 13, fontWeight: "900" },
  emptyPanel: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyText: { color: "#69756f", textAlign: "center", fontSize: 13, lineHeight: 19, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheetWrapper: {
    justifyContent: "flex-end",
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
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
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
  productPickerCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
});
