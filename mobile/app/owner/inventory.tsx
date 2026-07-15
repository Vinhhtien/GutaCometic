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
import {
  acknowledgeRestockRequest,
  createInventoryAdjustment,
  getIncomingTransfers,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
  receiveDirectStock,
} from "@/services/inventoryService";
import {
  IncomingStockTransfer,
  InventoryAdjustmentType,
  InventoryAlert,
  InventoryRestockRequest,
  ProductInventory,
} from "@/types/inventory";
import { ManagedStore } from "@/types/owner";
import { getOwnerStores } from "@/services/ownerService";

const ADJUSTMENT_LABELS: Record<InventoryAdjustmentType, string> = {
  DAMAGED: "Hàng hỏng",
  DEFECTIVE: "Hàng lỗi",
  EXPIRED: "Hết hạn",
  LOST: "Thất lạc",
  OTHER: "Khác",
};

const MAX_STOCK_RECEIVE_QUANTITY = 1000;
const PRODUCT_PICKER_LIMIT = 20;

type InventoryActionMode = "receive" | "writeoff";

const getInventoryForStore = (entry: ProductInventory, storeId: string) =>
  entry.inventories.find((inventory) => inventory.store._id === storeId);

export default function OwnerInventoryScreen() {
  const { token } = useAuth();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [requests, setRequests] = useState<InventoryRestockRequest[]>([]);
  const [transfers, setTransfers] = useState<IncomingStockTransfer[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [search, setSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionVisible, setIsActionVisible] = useState(false);
  const [actionMode, setActionMode] = useState<InventoryActionMode>("receive");
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [adjustmentType, setAdjustmentType] =
    useState<InventoryAdjustmentType>("DAMAGED");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInventory = useCallback(
    async (storeId: string, mode: "initial" | "refresh" = "initial") => {
      if (!token || !storeId) {
        return;
      }

      try {
        if (mode === "refresh") {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const [nextAlerts, nextRequests, nextTransfers, nextProducts] = await Promise.all([
          getInventoryAlerts(token, storeId).catch(() => []),
          getRestockRequests(token, "OPEN", storeId).catch(() => []),
          getIncomingTransfers(token, storeId).catch(() => []),
          getProductInventory(token, { limit: 100 }).catch(() => []),
        ]);

        setAlerts(nextAlerts);
        setRequests(nextRequests);
        setTransfers(nextTransfers);
        setProducts(nextProducts);
      } catch (error) {
        Alert.alert("Không tải được tồn kho", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        return;
      }

      try {
        const nextStores = await getOwnerStores(token, false);
        setStores(nextStores);
        const initialStoreId = nextStores[0]?._id || "";
        setSelectedStoreId(initialStoreId);

        if (initialStoreId) {
          await loadInventory(initialStoreId, "initial");
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
        Alert.alert("Không tải được cửa hàng", getErrorMessage(error));
      }
    };

    bootstrap();
  }, [loadInventory, token]);

  const selectedStore = useMemo(
    () => stores.find((store) => store._id === selectedStoreId) || null,
    [selectedStoreId, stores]
  );
  const isCentralStore = selectedStore?.type === "CENTRAL";

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((entry) => {
      const selectedInventory = getInventoryForStore(entry, selectedStoreId);

      if (!selectedInventory) {
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
  }, [products, search, selectedStoreId]);

  const actionProducts = useMemo(() => {
    const keyword = actionSearch.trim().toLowerCase();

    return products
      .filter((entry) => {
        const selectedInventory = getInventoryForStore(entry, selectedStoreId);

        if (!selectedInventory) {
          return false;
        }

        if (actionMode === "writeoff" && selectedInventory.availableStock <= 0) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return [entry.product.name, entry.product.sku, entry.product.brand]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, PRODUCT_PICKER_LIMIT);
  }, [actionMode, actionSearch, products, selectedStoreId]);

  const openActionModal = (mode: InventoryActionMode) => {
    if (!isCentralStore) {
      Alert.alert(
        "Đúng vai trò nghiệp vụ",
        "Nhập và trừ kho chi nhánh do manager phụ trách. Owner thao tác trực tiếp ở kho tổng."
      );
      return;
    }

    setActionMode(mode);
    setSelectedProduct(null);
    setQuantity("1");
    setNote("");
    setActionSearch("");
    setAdjustmentType("DAMAGED");
    setIsActionVisible(true);
  };

  const handleStoreChange = async (storeId: string) => {
    if (storeId === selectedStoreId) {
      return;
    }

    setSelectedStoreId(storeId);
    await loadInventory(storeId, "refresh");
  };

  const handleAcknowledgeRequest = async (request: InventoryRestockRequest) => {
    if (!token || processingId) {
      return;
    }

    try {
      setProcessingId(request._id);
      const updatedRequest = await acknowledgeRestockRequest(token, request._id);
      setRequests((current) =>
        current.map((item) =>
          item._id === updatedRequest._id ? updatedRequest : item
        )
      );
    } catch (error) {
      Alert.alert("Không đánh dấu được", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenTransferDraft = (request: InventoryRestockRequest) => {
    router.push({
      pathname: "/owner/transfers",
      params: {
        productId: request.productId._id,
        quantity: String(request.requestedQuantity),
        requestId: request._id,
        requestStoreName: request.storeId.name,
        toStoreId: request.storeId._id,
      },
    });
  };

  const handleInventoryAction = async () => {
    if (!token || !selectedProduct || !selectedStoreId || !isCentralStore) {
      return;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Vui lòng nhập số lượng lớn hơn 0.");
      return;
    }

    if (actionMode === "receive" && parsedQuantity > MAX_STOCK_RECEIVE_QUANTITY) {
      Alert.alert(
        "Vượt giới hạn nhập kho",
        `Mỗi lần nhập kho chỉ được tối đa ${MAX_STOCK_RECEIVE_QUANTITY} sản phẩm.`
      );
      return;
    }

    try {
      setProcessingId(selectedProduct.product._id);

      if (actionMode === "receive") {
        await receiveDirectStock(token, {
          note,
          productId: selectedProduct.product._id,
          quantity: parsedQuantity,
          storeId: selectedStoreId,
        });
      } else {
        await createInventoryAdjustment(token, {
          note,
          productId: selectedProduct.product._id,
          quantity: parsedQuantity,
          storeId: selectedStoreId,
          type: adjustmentType,
        });
      }

      setIsActionVisible(false);
      await loadInventory(selectedStoreId, "refresh");
      Alert.alert(
        actionMode === "receive" ? "Đã nhập hàng" : "Đã trừ tồn kho",
        actionMode === "receive"
          ? "Kho tổng đã được cộng thêm số lượng."
          : "Báo cáo kiểm kê đã được ghi nhận."
      );
    } catch (error) {
      Alert.alert("Không thực hiện được", getErrorMessage(error));
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
          <Text style={styles.eyebrow}>CHAIN INVENTORY</Text>
          <Text style={styles.title}>Tồn kho</Text>
          <Text style={styles.subtitle}>Theo dõi kho theo cửa hàng</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải dữ liệu tồn kho...</Text>
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
              onRefresh={() =>
                selectedStoreId
                  ? loadInventory(selectedStoreId, "refresh")
                  : undefined
              }
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Cửa hàng</Text>
          <View style={styles.storeList}>
            {stores.map((store) => {
              const active = selectedStoreId === store._id;

              return (
                <Pressable
                  key={store._id}
                  onPress={() => handleStoreChange(store._id)}
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

          <View style={styles.summaryRow}>
            <SummaryCard label="Cảnh báo" value={String(alerts.length)} />
            <SummaryCard label="Sales báo" value={String(requests.length)} />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard label="Chờ manager nhận" value={String(transfers.length)} />
            <SummaryCard
              label={isCentralStore ? "Vai trò Owner" : "Vai trò Chi nhánh"}
              value={isCentralStore ? "Kho tổng" : "Manager xử lý"}
            />
          </View>

          {isCentralStore ? (
            <View style={styles.actionPanel}>
              <Pressable
                onPress={() => openActionModal("receive")}
                style={styles.actionButton}
              >
                <Ionicons color="#252525" name="add-circle-outline" size={18} />
                <Text style={styles.actionButtonText}>Nhập kho</Text>
              </Pressable>
              <Pressable
                onPress={() => openActionModal("writeoff")}
                style={styles.dangerActionButton}
              >
                <Ionicons color="#9f2639" name="remove-circle-outline" size={18} />
                <Text style={styles.dangerActionButtonText}>Trừ kho</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noticePanel}>
              <Ionicons color="#2d5a4b" name="people-outline" size={18} />
              <Text style={styles.noticeText}>
                Chi nhánh này do manager xử lý nhập kho.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            Cảnh báo {selectedStore?.name || "cửa hàng"}
          </Text>
          <View style={styles.cardList}>
            {alerts.length === 0 ? (
              <EmptyPanel text="Chưa có cảnh báo tồn thấp hoặc sắp hết hạn ở cửa hàng này." />
            ) : (
              alerts.map((alert) => (
                <View key={`${alert.inventoryId}-${alert.type}`} style={styles.alertCard}>
                  <View style={styles.alertIcon}>
                    <Ionicons
                      color={alert.severity === "CRITICAL" ? "#9f2639" : "#9a6b13"}
                      name={
                        alert.type === "LOW_STOCK"
                          ? "trending-down-outline"
                          : "calendar-outline"
                      }
                      size={19}
                    />
                  </View>
                  <View style={styles.alertCopy}>
                    <Text style={styles.cardTitle}>{alert.product.name}</Text>
                    <Text style={styles.cardMeta}>
                      {alert.message} · Còn {alert.availableStock}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Yêu cầu bổ sung</Text>
          <View style={styles.cardList}>
            {requests.length === 0 ? (
              <EmptyPanel text="Không có yêu cầu bổ sung hàng đang mở ở cửa hàng đang xem." />
            ) : (
              requests.map((request) => (
                <View key={request._id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.alertCopy}>
                      <Text style={styles.cardTitle}>{request.productId.name}</Text>
                      <Text style={styles.cardMeta}>
                        Đề xuất {request.requestedQuantity} · Còn {request.currentAvailableStock}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.readStatusPill,
                        request.acknowledgedBy && styles.readStatusPillDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.readStatusText,
                          request.acknowledgedBy && styles.readStatusTextDone,
                        ]}
                      >
                        {request.acknowledgedBy ? "Đã xem" : "Cần xem"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reasonText}>{request.reason}</Text>
                  <Text style={styles.helperText}>
                    Sales tạo: {request.requestedBy.fullName}
                  </Text>

                  <View style={styles.requestActionRow}>
                    {!request.acknowledgedBy ? (
                      <Pressable
                        disabled={processingId === request._id}
                        onPress={() => handleAcknowledgeRequest(request)}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>Đánh dấu đã xem</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => handleOpenTransferDraft(request)}
                      style={styles.primaryInlineButton}
                    >
                      <Text style={styles.primaryInlineButtonText}>Mở phiếu</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>
            Phiếu chờ nhận
          </Text>
          <View style={styles.cardList}>
            {transfers.length === 0 ? (
              <EmptyPanel text="Không có phiếu điều chuyển đang chờ manager xác nhận ở cửa hàng này." />
            ) : (
              transfers.map((transfer) => (
                <View key={transfer._id} style={styles.transferCard}>
                  <Text style={styles.cardTitle}>Từ {transfer.fromStoreId.name}</Text>
                  <Text style={styles.cardMeta}>
                    {transfer.items.reduce((sum, item) => sum + item.quantity, 0)} đơn vị ·{" "}
                    {transfer.items.length} sản phẩm
                  </Text>
                  {transfer.items.slice(0, 4).map((item) => (
                    <Text key={item.productId._id} style={styles.itemText}>
                      {item.productId.name} x{item.quantity}
                    </Text>
                  ))}
                  <View style={styles.noticePanelSmall}>
                    <Ionicons color="#52605a" name="information-circle-outline" size={16} />
                    <Text style={styles.noticeSmallText}>
                      Manager xác nhận ở chi nhánh đích.
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Sản phẩm tồn kho</Text>
          <View style={styles.searchBox}>
            <Ionicons color="#69756f" name="search-outline" size={18} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Tìm theo tên, SKU hoặc hãng..."
              placeholderTextColor="#8a948f"
              style={styles.searchInput}
              value={search}
            />
          </View>

          <View style={styles.cardList}>
            {visibleProducts.length === 0 ? (
              <EmptyPanel text="Không tìm thấy sản phẩm phù hợp trong cửa hàng đang xem." />
            ) : (
              visibleProducts.map((entry) => {
                const selectedInventory = getInventoryForStore(entry, selectedStoreId);
                const totalAvailable = entry.inventories.reduce(
                  (sum, inventory) => sum + inventory.availableStock,
                  0
                );

                return (
                  <View key={entry.product._id} style={styles.productCard}>
                    <Text style={styles.cardTitle}>{entry.product.name}</Text>
                    <Text style={styles.cardMeta}>
                      {entry.product.sku} · {entry.product.brand}
                    </Text>
                    <View style={styles.stockRow}>
                      <View style={styles.stockBox}>
                        <Text style={styles.stockValue}>
                          {selectedInventory?.availableStock || 0}
                        </Text>
                        <Text style={styles.stockLabel}>Khả dụng tại store</Text>
                      </View>
                      <View style={styles.stockBox}>
                        <Text style={styles.stockValue}>{totalAvailable}</Text>
                        <Text style={styles.stockLabel}>Khả dụng toàn chuỗi</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent visible={isActionVisible}>
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
                <Text style={styles.sheetTitle}>
                  {actionMode === "receive" ? "Nhập hàng vào kho tổng" : "Trừ tồn kho tổng"}
                </Text>
                <Pressable
                  onPress={() => setIsActionVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons color="#252525" name="close" size={20} />
                </Pressable>
              </View>

              <ScrollView
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Chọn sản phẩm</Text>
                <View style={styles.searchBox}>
                  <Ionicons color="#69756f" name="search-outline" size={18} />
                  <TextInput
                    onChangeText={setActionSearch}
                    placeholder={
                      actionMode === "receive"
                        ? "Tìm sản phẩm cần nhập..."
                        : "Tìm sản phẩm cần trừ kho..."
                    }
                    placeholderTextColor="#8a948f"
                    style={styles.searchInput}
                    value={actionSearch}
                  />
                </View>

                <View style={styles.selectionList}>
                  {actionProducts.length === 0 ? (
                    <EmptyPanel
                      text={
                        actionMode === "receive"
                          ? "Không có sản phẩm phù hợp để nhập thêm vào kho tổng."
                          : "Kho tổng chưa có sản phẩm nào còn tồn để trừ kho."
                      }
                    />
                  ) : (
                    actionProducts.map((entry) => {
                      const active = selectedProduct?.product._id === entry.product._id;
                      const inventory = getInventoryForStore(entry, selectedStoreId);

                      return (
                        <Pressable
                          key={entry.product._id}
                          onPress={() => setSelectedProduct(entry)}
                          style={[
                            styles.selectionRow,
                            active && styles.selectionRowActive,
                          ]}
                        >
                          <View style={styles.alertCopy}>
                            <Text style={styles.cardTitle}>{entry.product.name}</Text>
                            <Text style={styles.cardMeta}>
                              {entry.product.brand} · Tồn khả dụng:{" "}
                              {inventory?.availableStock || 0}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>

                {actionMode === "writeoff" ? (
                  <>
                    <Text style={styles.inputLabel}>Lý do trừ kho</Text>
                    <View style={styles.typeRow}>
                      {(Object.keys(
                        ADJUSTMENT_LABELS
                      ) as InventoryAdjustmentType[]).map((type) => {
                        const active = adjustmentType === type;

                        return (
                          <Pressable
                            key={type}
                            onPress={() => setAdjustmentType(type)}
                            style={[styles.typeChip, active && styles.typeChipActive]}
                          >
                            <Text
                              style={[
                                styles.typeChipText,
                                active && styles.typeChipTextActive,
                              ]}
                            >
                              {ADJUSTMENT_LABELS[type]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.inputLabel}>Số lượng</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ""))}
                  style={styles.input}
                  value={quantity}
                />
                {actionMode === "receive" ? (
                  <Text style={styles.receiveLimitText}>
                    Tối đa mỗi lần nhập: {MAX_STOCK_RECEIVE_QUANTITY}
                  </Text>
                ) : null}

                <Text style={styles.inputLabel}>Ghi chú</Text>
                <TextInput
                  multiline
                  onChangeText={setNote}
                  style={[styles.input, styles.noteInput]}
                  textAlignVertical="top"
                  value={note}
                />

                <Pressable
                  disabled={!selectedProduct || processingId === selectedProduct?.product._id}
                  onPress={handleInventoryAction}
                  style={styles.primaryButton}
                >
                  {processingId === selectedProduct?.product._id ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {actionMode === "receive" ? "Xác nhận nhập hàng" : "Ghi nhận trừ kho"}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
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

function EmptyPanel({ text }: { text: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyText}>{text}</Text>
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
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  storeList: { gap: 8 },
  storeChip: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeChipActive: { backgroundColor: "#eef4ef", borderColor: "#9fb8ad" },
  storeChipText: { color: "#52605a", fontSize: 12, fontWeight: "800" },
  storeChipTextActive: { color: "#2d5a4b" },
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
  actionPanel: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  actionButtonText: { color: "#252525", fontSize: 12, fontWeight: "900" },
  dangerActionButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#fff1f3",
  },
  dangerActionButtonText: { color: "#9f2639", fontSize: 12, fontWeight: "900" },
  noticePanel: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
    borderWidth: 1,
    borderColor: "#d9e4dc",
  },
  noticeText: {
    flex: 1,
    color: "#2d5a4b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  cardList: { gap: 10 },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  alertIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fff7eb",
  },
  alertCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  cardMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  requestCard: {
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  requestHeader: { flexDirection: "row", gap: 10 },
  readStatusPill: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fff7eb",
  },
  readStatusPillDone: { backgroundColor: "#eef4ef" },
  readStatusText: { color: "#9a6b13", fontSize: 10, fontWeight: "900" },
  readStatusTextDone: { color: "#2d5a4b" },
  reasonText: { color: "#52605a", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  helperText: { color: "#69756f", fontSize: 12, fontWeight: "700" },
  requestActionRow: { flexDirection: "row", gap: 8 },
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
  secondaryButtonText: { color: "#252525", fontSize: 12, fontWeight: "900" },
  primaryInlineButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryInlineButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  transferCard: {
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  itemText: { color: "#52605a", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  noticePanelSmall: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  noticeSmallText: {
    flex: 1,
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
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
  productCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  stockRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  stockBox: {
    flex: 1,
    minHeight: 72,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  stockValue: { color: "#1f2522", fontSize: 20, fontWeight: "900" },
  stockLabel: { marginTop: 4, color: "#69756f", fontSize: 11, fontWeight: "800" },
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
  emptyText: {
    color: "#69756f",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheetWrapper: { justifyContent: "flex-end" },
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
  inputLabel: { marginBottom: 6, color: "#52605a", fontSize: 12, fontWeight: "900" },
  selectionList: { gap: 8, marginBottom: 12 },
  selectionRow: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  selectionRowActive: {
    backgroundColor: "#eef4ef",
    borderColor: "#9fb8ad",
  },
  input: {
    minHeight: 46,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
    color: "#1f2522",
    fontWeight: "800",
  },
  receiveLimitText: {
    marginTop: -2,
    marginBottom: 10,
    color: "#52605a",
    fontSize: 12,
    fontWeight: "800",
  },
  noteInput: { minHeight: 86, paddingTop: 12 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  typeChip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  typeChipActive: { backgroundColor: "#252525", borderColor: "#252525" },
  typeChipText: { color: "#52605a", fontSize: 12, fontWeight: "900" },
  typeChipTextActive: { color: "#ffffff" },
  primaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
});
