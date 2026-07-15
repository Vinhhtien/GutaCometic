import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  confirmIncomingTransfer,
  createInventoryAdjustment,
  getIncomingTransfers,
  getInventoryAdjustments,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
  receiveDirectStock,
  receiveRestockRequest,
  updateRestockRequestStatus,
} from "@/services/inventoryService";
import {
  IncomingStockTransfer,
  InventoryAdjustment,
  InventoryAdjustmentType,
  InventoryAlert,
  InventoryRestockRequest,
  ProductInventory,
} from "@/types/inventory";

const ADJUSTMENT_LABELS: Record<InventoryAdjustmentType, string> = {
  DAMAGED: "Hàng hỏng",
  DEFECTIVE: "Hàng lỗi",
  LOST: "Mất mát",
  EXPIRED: "Hết hạn",
  OTHER: "Khác",
};

const ALERT_PREVIEW_LIMIT = 6;
const MAX_STOCK_RECEIVE_QUANTITY = 1000;
const PRODUCT_PICKER_LIMIT = 20;
const getAlertKey = (alert: InventoryAlert) => `${alert.inventoryId}-${alert.type}`;

const normalizeQuantityValue = (
  value: string,
  {
    max,
    min = 1,
  }: {
    max?: number;
    min?: number;
  } = {}
) => {
  const digits = value.replace(/[^0-9]/g, "");

  if (!digits) {
    return "";
  }

  const parsed = Number.parseInt(digits, 10);

  if (!Number.isInteger(parsed)) {
    return "";
  }

  const normalized = Math.max(min, max ? Math.min(parsed, max) : parsed);
  return String(normalized);
};

export default function ManagerInventoryScreen() {
  const { activeStore, token, user } = useAuth();
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [requests, setRequests] = useState<InventoryRestockRequest[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [transfers, setTransfers] = useState<IncomingStockTransfer[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(null);
  const [isDirectReceiveVisible, setIsDirectReceiveVisible] = useState(false);
  const [isWriteOffVisible, setIsWriteOffVisible] = useState(false);
  const [selectedDirectProduct, setSelectedDirectProduct] =
    useState<ProductInventory | null>(null);
  const [selectedWriteOffProduct, setSelectedWriteOffProduct] =
    useState<ProductInventory | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<InventoryRestockRequest | null>(null);
  const [adjustmentType, setAdjustmentType] =
    useState<InventoryAdjustmentType>("DAMAGED");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("1");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [directReceiveQuantity, setDirectReceiveQuantity] = useState("1");
  const [directReceiveNote, setDirectReceiveNote] = useState("");
  const [writeOffQuantity, setWriteOffQuantity] = useState("1");
  const [writeOffNote, setWriteOffNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [hiddenAlertKeys, setHiddenAlertKeys] = useState<string[]>([]);
  const [isAlertListExpanded, setIsAlertListExpanded] = useState(false);

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
        const [
          nextAlerts,
          nextRequests,
          nextAdjustments,
          nextTransfers,
          nextProducts,
        ] =
          await Promise.all([
            getInventoryAlerts(token).catch(() => []),
            getRestockRequests(token, "OPEN").catch(() => []),
            getInventoryAdjustments(token).catch(() => []),
            getIncomingTransfers(token).catch(() => []),
            getProductInventory(token, { limit: PRODUCT_PICKER_LIMIT }).catch(() => []),
          ]);
        setAlerts(nextAlerts);
        setHiddenAlertKeys([]);
        setIsAlertListExpanded(false);
        setRequests(nextRequests);
        setAdjustments(nextAdjustments);
        setTransfers(nextTransfers);
        setProducts(nextProducts);
      } catch (error) {
        Alert.alert("Không tải được kiểm kho", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(
    () => ({
      alerts: alerts.length,
      requests: requests.length,
      transfers: transfers.length,
      adjustments: adjustments.length,
    }),
    [adjustments.length, alerts.length, requests.length, transfers.length]
  );

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => !hiddenAlertKeys.includes(getAlertKey(alert))),
    [alerts, hiddenAlertKeys]
  );

  const renderedAlerts = useMemo(
    () =>
      isAlertListExpanded
        ? visibleAlerts
        : visibleAlerts.slice(0, ALERT_PREVIEW_LIMIT),
    [isAlertListExpanded, visibleAlerts]
  );

  const openReceiveModal = (request: InventoryRestockRequest) => {
    setSelectedRequest(request);
    setReceiveQuantity(String(request.requestedQuantity));
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
      Alert.alert("Đã đọc thông báo", "Yêu cầu của Sales vẫn đang mở để nhập hàng.");
    } catch (error) {
      Alert.alert("Không xác nhận được", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReceiveRequest = async () => {
    if (!token || !selectedRequest || processingId) {
      return;
    }

    const quantity = Number.parseInt(receiveQuantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Vui lòng nhập số lượng hàng đã về.");
      return;
    }
    if (quantity > MAX_STOCK_RECEIVE_QUANTITY) {
      Alert.alert(
        "Vuot gioi han nhap kho",
        `Moi lan nhap kho chi duoc toi da ${MAX_STOCK_RECEIVE_QUANTITY} san pham.`
      );
      return;
    }
    if (quantity > selectedRequest.requestedQuantity) {
      Alert.alert(
        "Vuot so luong de xuat",
        "Phieu nay chi cho nhap toi da " + selectedRequest.requestedQuantity + " san pham."
      );
      return;
    }

    try {
      setProcessingId(selectedRequest._id);
      await receiveRestockRequest(token, selectedRequest._id, {
        receivedQuantity: quantity,
        managerNote: `Manager nhập ${quantity} sản phẩm về chi nhánh.`,
      });
      setSelectedRequest(null);
      setRequests((current) =>
        current.filter((item) => item._id !== selectedRequest._id)
      );
      await loadData("refresh");
      Alert.alert("Đã nhập hàng", "Tồn kho chi nhánh đã được cộng thêm.");
    } catch (error) {
      Alert.alert("Không nhập được hàng", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = (request: InventoryRestockRequest) => {
    if (!token || processingId) {
      return;
    }

    Alert.alert(
      "Hủy yêu cầu bổ sung?",
      "Yêu cầu sẽ được đóng lại và không cộng thêm tồn kho.",
      [
        { style: "cancel", text: "Giữ lại" },
        {
          style: "destructive",
          text: "Hủy yêu cầu",
          onPress: async () => {
            try {
              setProcessingId(request._id);
              await updateRestockRequestStatus(token, request._id, {
                status: "CANCELLED",
                managerNote: "Manager hủy yêu cầu bổ sung hàng.",
              });
              setRequests((current) =>
                current.filter((item) => item._id !== request._id)
              );
              Alert.alert("Đã hủy yêu cầu", "Yêu cầu từ Sales đã được đóng.");
            } catch (error) {
              Alert.alert("Không hủy được yêu cầu", getErrorMessage(error));
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openDirectReceiveModal = () => {
    setIsDirectReceiveVisible(true);
    setSelectedDirectProduct(null);
    setDirectReceiveQuantity("1");
    setDirectReceiveNote("");
  };

  const handleDirectReceive = async () => {
    if (!token || !selectedDirectProduct || processingId) {
      return;
    }

    const quantity = Number.parseInt(directReceiveQuantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Vui lòng nhập số lượng hàng về kho.");
      return;
    }

    if (quantity > MAX_STOCK_RECEIVE_QUANTITY) {
      Alert.alert(
        "Vuot gioi han nhap kho",
        `Moi lan nhap kho chi duoc toi da ${MAX_STOCK_RECEIVE_QUANTITY} san pham.`
      );
      return;
    }

    try {
      setProcessingId(selectedDirectProduct.product._id);
      await receiveDirectStock(token, {
        productId: selectedDirectProduct.product._id,
        quantity,
        note: directReceiveNote,
      });
      setIsDirectReceiveVisible(false);
      await loadData("refresh");
      Alert.alert("Đã nhập hàng", "Tồn kho chi nhánh đã được cộng thêm.");
    } catch (error) {
      Alert.alert("Không nhập được hàng", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const openAdjustmentModal = (alert: InventoryAlert) => {
    setSelectedAlert(alert);
    setAdjustmentType(alert.type === "EXPIRED" ? "EXPIRED" : "DAMAGED");
    setAdjustmentQuantity("1");
    setAdjustmentNote("");
  };

  const handleCreateAdjustment = async () => {
    if (!token || !selectedAlert || processingId) {
      return;
    }

    const quantity = Number.parseInt(adjustmentQuantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Vui lòng nhập số lượng cần trừ kho.");
      return;
    }

    try {
      setProcessingId(selectedAlert.inventoryId);
      const adjustment = await createInventoryAdjustment(token, {
        productId: selectedAlert.product._id,
        quantity,
        type: adjustmentType,
        note: adjustmentNote,
      });
      setAdjustments((current) => [adjustment, ...current]);
      setSelectedAlert(null);
      await loadData("refresh");
      Alert.alert("Đã ghi nhận kiểm kê", "Tồn kho đã được trừ theo báo cáo.");
    } catch (error) {
      Alert.alert("Không tạo được báo cáo", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const openWriteOffModal = () => {
    setIsWriteOffVisible(true);
    setSelectedWriteOffProduct(null);
    setAdjustmentType("DAMAGED");
    setWriteOffQuantity("1");
    setWriteOffNote("");
  };

  const handleCreateWriteOff = async () => {
    if (!token || !selectedWriteOffProduct || processingId) {
      return;
    }

    const quantity = Number.parseInt(writeOffQuantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Vui lòng nhập số lượng cần trừ kho.");
      return;
    }

    try {
      setProcessingId(selectedWriteOffProduct.product._id);
      const adjustment = await createInventoryAdjustment(token, {
        productId: selectedWriteOffProduct.product._id,
        quantity,
        type: adjustmentType,
        note: writeOffNote,
      });
      setAdjustments((current) => [adjustment, ...current]);
      setIsWriteOffVisible(false);
      await loadData("refresh");
      Alert.alert("Đã trừ tồn kho", "Báo cáo kiểm kê đã được ghi nhận.");
    } catch (error) {
      Alert.alert("Không trừ được tồn kho", getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmTransfer = async (transfer: IncomingStockTransfer) => {
    if (!token || processingId) {
      return;
    }

    try {
      setProcessingId(transfer._id);
      await confirmIncomingTransfer(token, transfer._id);
      setTransfers((current) =>
        current.filter((item) => item._id !== transfer._id)
      );
      await loadData("refresh");
      Alert.alert("Đã nhận điều chuyển", "Tồn kho chi nhánh đã được cập nhật.");
    } catch (error) {
      Alert.alert("Không xác nhận được điều chuyển", getErrorMessage(error));
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
          <Text style={styles.eyebrow}>KIỂM KHO CHI NHÁNH</Text>
          <Text style={styles.title}>Tồn kho & nhập hàng</Text>
          <Text style={styles.subtitle}>
            {user?.fullName} · {activeStore?.name || "Chưa chọn chi nhánh"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải dữ liệu kiểm kho...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={requests}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadData("refresh")}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.summaryPanel}>
                <MetricBox label="Cảnh báo" value={summary.alerts} />
                <MetricBox label="Sales báo" value={summary.requests} />
                <MetricBox label="Điều chuyển" value={summary.transfers} />
                <MetricBox label="Kiểm kê" value={summary.adjustments} />
              </View>

              <View style={styles.managerFlowPanel}>
                <View style={styles.managerFlowHeader}>
                  <Text style={styles.managerFlowTitle}>Quy trình xử lý kho</Text>
                  <View style={styles.managerFlowActions}>
                    <Pressable
                      onPress={openDirectReceiveModal}
                      style={styles.directReceiveButton}
                    >
                    <Ionicons color="#252525" name="add-circle-outline" size={17} />
                    <Text style={styles.directReceiveButtonText}>Nhập hàng</Text>
                    </Pressable>
                    <Pressable
                      onPress={openWriteOffModal}
                      style={styles.writeOffButton}
                    >
                      <Ionicons color="#9f2639" name="remove-circle-outline" size={17} />
                      <Text style={styles.writeOffButtonText}>Trừ hàng</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.managerFlowGrid}>
                  <ManagerFlowStep icon="mail-open-outline" label="Đọc thông báo Sales" />
                  <ManagerFlowStep icon="archive-outline" label="Nhập hàng về kho" />
                  <ManagerFlowStep icon="remove-circle-outline" label="Trừ hàng lỗi/hết hạn" />
                </View>
              </View>

              <SectionTitle title="Cảnh báo hệ thống" />
              <View style={styles.alertToolbar}>
                {visibleAlerts.length > ALERT_PREVIEW_LIMIT ? (
                  <Pressable
                    onPress={() => setIsAlertListExpanded((current) => !current)}
                    style={styles.alertToolbarButton}
                  >
                    <Text style={styles.alertToolbarButtonText}>
                      {isAlertListExpanded ? "Thu gon" : "Xem them"}
                    </Text>
                  </Pressable>
                ) : null}
                {alerts.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setHiddenAlertKeys(alerts.map(getAlertKey));
                      setIsAlertListExpanded(false);
                    }}
                    style={styles.alertToolbarButton}
                  >
                    <Text style={styles.alertToolbarButtonText}>Xoa tat ca</Text>
                  </Pressable>
                ) : null}
                {hiddenAlertKeys.length > 0 ? (
                  <Pressable
                    onPress={() => setHiddenAlertKeys([])}
                    style={styles.alertToolbarButton}
                  >
                    <Text style={styles.alertToolbarButtonText}>Khoi phuc</Text>
                  </Pressable>
                ) : null}
              </View>
              {visibleAlerts.length === 0 ? (
                <EmptyPanel text="Chưa có sản phẩm dưới 10 hoặc sắp hết hạn." />
              ) : (
                <View style={styles.cardList}>
                  {renderedAlerts.map((alert) => (
                    <View
                      key={`${alert.inventoryId}-${alert.type}`}
                      style={styles.alertCard}
                    >
                      <View style={styles.alertIcon}>
                        <Ionicons
                          color={
                            alert.severity === "CRITICAL" ? "#9f2639" : "#9a6b13"
                          }
                          name={
                            alert.type === "LOW_STOCK"
                              ? "trending-down-outline"
                              : "calendar-outline"
                          }
                          size={20}
                        />
                      </View>
                      <View style={styles.cardCopy}>
                        <Text numberOfLines={2} style={styles.cardTitle}>
                          {alert.product.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {alert.message} · Còn {alert.availableStock}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openAdjustmentModal(alert)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>Kiểm kê</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <SectionTitle title="Hàng điều chuyển chờ nhận" />
              {transfers.length === 0 ? (
                <EmptyPanel text="Chưa có phiếu điều chuyển gửi tới chi nhánh." />
              ) : (
                <View style={styles.cardList}>
                  {transfers.map((transfer) => (
                    <View key={transfer._id} style={styles.requestCard}>
                      <Text style={styles.cardTitle}>
                        Từ {transfer.fromStoreId.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {transfer.items.length} sản phẩm ·{" "}
                        {transfer.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}{" "}
                        đơn vị
                      </Text>
                      {transfer.items.slice(0, 3).map((item) => (
                        <Text key={item.productId._id} style={styles.itemText}>
                          {item.productId.name} x{item.quantity}
                        </Text>
                      ))}
                      <Pressable
                        disabled={processingId === transfer._id}
                        onPress={() => handleConfirmTransfer(transfer)}
                        style={styles.primaryButton}
                      >
                        {processingId === transfer._id ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>
                            Xác nhận nhập điều chuyển
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <SectionTitle title="Yêu cầu từ Sales" />
            </>
          }
          ListEmptyComponent={
            <EmptyPanel text="Chưa có yêu cầu bổ sung hàng đang mở." />
          }
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.cardCopy}>
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {item.productId.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.requestedBy.fullName} · Còn {item.currentAvailableStock}
                  </Text>
                </View>
                <View
                  style={[
                    styles.readStatusPill,
                    item.acknowledgedAt && styles.readStatusPillDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.readStatusText,
                      item.acknowledgedAt && styles.readStatusTextDone,
                    ]}
                  >
                    {item.acknowledgedAt ? "Đã đọc" : "Chưa đọc"}
                  </Text>
                </View>
                <View style={styles.quantityBox}>
                  <Text style={styles.quantityValue}>
                    +{item.requestedQuantity}
                  </Text>
                  <Text style={styles.quantityLabel}>đề xuất</Text>
                </View>
              </View>
              <Text style={styles.reasonText}>{item.reason}</Text>
              <View style={styles.requestActionRow}>
                <Pressable
                  disabled={Boolean(item.acknowledgedAt) || processingId === item._id}
                  onPress={() => handleAcknowledgeRequest(item)}
                  style={[
                    styles.secondaryButton,
                    Boolean(item.acknowledgedAt) && styles.disabledButton,
                  ]}
                >
                  <Ionicons color="#252525" name="mail-open-outline" size={17} />
                  <Text style={styles.secondaryButtonText}>Đã đọc</Text>
                </Pressable>
                <Pressable
                  disabled={processingId === item._id}
                  onPress={() => openReceiveModal(item)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Nhập hàng về kho</Text>
                </Pressable>
              </View>
              <Pressable
                disabled={processingId === item._id}
                onPress={() => handleCancelRequest(item)}
                style={styles.cancelRequestButton}
              >
                <Ionicons color="#9f2639" name="close-circle-outline" size={17} />
                <Text style={styles.cancelRequestButtonText}>Hủy yêu cầu</Text>
              </Pressable>
            </View>
          )}
          ListFooterComponent={
            <>
              <SectionTitle title="Báo cáo kiểm kê gần đây" />
              {adjustments.length === 0 ? (
                <EmptyPanel text="Chưa có báo cáo hàng lỗi, hỏng hoặc mất mát." />
              ) : (
                <View style={styles.cardList}>
                  {adjustments.slice(0, 6).map((adjustment) => (
                    <View key={adjustment._id} style={styles.adjustmentRow}>
                      <View style={styles.cardCopy}>
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {adjustment.productId.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {ADJUSTMENT_LABELS[adjustment.type]} · Trừ{" "}
                          {adjustment.quantity}
                        </Text>
                      </View>
                      <Ionicons color="#9f2639" name="remove-circle-outline" size={22} />
                    </View>
                  ))}
                </View>
              )}
            </>
          }
        />
      )}

      <ReceiveModal
        isProcessing={processingId === selectedRequest?._id}
        maxQuantity={selectedRequest?.requestedQuantity || undefined}
        onClose={() => setSelectedRequest(null)}
        onConfirm={handleReceiveRequest}
        quantity={receiveQuantity}
        request={selectedRequest}
        setQuantity={setReceiveQuantity}
      />

      <DirectReceiveModal
        currentStoreId={activeStore?._id || ""}
        currentStoreName={activeStore?.name || "chi nhánh đang chọn"}
        isProcessing={processingId === selectedDirectProduct?.product._id}
        note={directReceiveNote}
        onClose={() => setIsDirectReceiveVisible(false)}
        onConfirm={handleDirectReceive}
        products={products}
        quantity={directReceiveQuantity}
        selectedProduct={selectedDirectProduct}
        setNote={setDirectReceiveNote}
        setQuantity={setDirectReceiveQuantity}
        setSelectedProduct={setSelectedDirectProduct}
        token={token}
        visible={isDirectReceiveVisible}
      />

      <AdjustmentModal
        alert={selectedAlert}
        isProcessing={processingId === selectedAlert?.inventoryId}
        note={adjustmentNote}
        onClose={() => setSelectedAlert(null)}
        onConfirm={handleCreateAdjustment}
        quantity={adjustmentQuantity}
        setNote={setAdjustmentNote}
        setQuantity={setAdjustmentQuantity}
        setType={setAdjustmentType}
        type={adjustmentType}
      />

      <WriteOffModal
        currentStoreId={activeStore?._id || ""}
        currentStoreName={activeStore?.name || "chi nhánh đang chọn"}
        isProcessing={processingId === selectedWriteOffProduct?.product._id}
        note={writeOffNote}
        onClose={() => setIsWriteOffVisible(false)}
        onConfirm={handleCreateWriteOff}
        products={products}
        quantity={writeOffQuantity}
        selectedProduct={selectedWriteOffProduct}
        setNote={setWriteOffNote}
        setQuantity={setWriteOffQuantity}
        setSelectedProduct={setSelectedWriteOffProduct}
        setType={setAdjustmentType}
        token={token}
        type={adjustmentType}
        visible={isWriteOffVisible}
      />
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ManagerFlowStep({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.managerFlowStep}>
      <Ionicons color="#52605a" name={icon} size={16} />
      <Text style={styles.managerFlowText}>{label}</Text>
    </View>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Ionicons color="#7c8781" name="cube-outline" size={28} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ReceiveModal({
  isProcessing,
  maxQuantity,
  onClose,
  onConfirm,
  quantity,
  request,
  setQuantity,
}: {
  isProcessing: boolean;
  maxQuantity?: number;
  onClose: () => void;
  onConfirm: () => void;
  quantity: string;
  request: InventoryRestockRequest | null;
  setQuantity: (value: string) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={Boolean(request)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.sheet}>
          <SheetHeader onClose={onClose} title="Nhập hàng về kho" />
          {request ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetProduct}>{request.productId.name}</Text>
              <Text style={styles.sheetMeta}>
                Sales đề xuất: {request.requestedQuantity} · Hiện còn{" "}
                {request.currentAvailableStock}
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setQuantity(
                    normalizeQuantityValue(value, {
                      max: Math.min(
                        request.requestedQuantity,
                        MAX_STOCK_RECEIVE_QUANTITY
                      ),
                    })
                  )
                }
                placeholder="Số lượng hàng đã về"
                placeholderTextColor="#8a948f"
                style={styles.input}
                value={quantity}
              />
              <Text style={styles.sheetHint}>
                Tối đa mỗi lần nhập:{" "}
                {Math.min(request.requestedQuantity, MAX_STOCK_RECEIVE_QUANTITY)}
              </Text>
              <QuantityStepper
                maxQuantity={maxQuantity}
                quantity={quantity}
                setQuantity={setQuantity}
              />
              <Pressable
                disabled={isProcessing}
                onPress={onConfirm}
                style={styles.primaryButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Xác nhận nhập kho</Text>
                )}
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DirectReceiveModal({
  currentStoreId,
  currentStoreName,
  isProcessing,
  note,
  onClose,
  onConfirm,
  products,
  quantity,
  selectedProduct,
  setNote,
  setQuantity,
  setSelectedProduct,
  token,
  visible,
}: {
  currentStoreId: string;
  currentStoreName: string;
  isProcessing: boolean;
  note: string;
  onClose: () => void;
  onConfirm: () => void;
  products: ProductInventory[];
  quantity: string;
  selectedProduct: ProductInventory | null;
  setNote: (value: string) => void;
  setQuantity: (value: string) => void;
  setSelectedProduct: (product: ProductInventory) => void;
  token: string | null;
  visible: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductInventory[]>(products);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const currentStoreInventory = selectedProduct?.inventories.find(
    (inventory) => String(inventory.store._id) === currentStoreId
  );
  const currentStock = currentStoreInventory?.availableStock || 0;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const keyword = productSearch.trim().toLowerCase();

    if (!token) {
      setProductOptions(products);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingProducts(true);
        const nextProducts = await getProductInventory(token, {
          limit: PRODUCT_PICKER_LIMIT,
          search: keyword || undefined,
        });

        if (!isCancelled) {
          setProductOptions(nextProducts);
        }
      } catch {
        if (!isCancelled) {
          setProductOptions(keyword ? [] : products);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingProducts(false);
        }
      }
    }, keyword ? 250 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [productSearch, products, token, visible]);

  const productResultText = productSearch.trim()
    ? `Đang hiện tối đa ${PRODUCT_PICKER_LIMIT} kết quả phù hợp`
    : `Đang hiện ${productOptions.length} sản phẩm mới nhất. Tìm tên hoặc SKU để chọn nhanh.`;

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.sheet}>
          <SheetHeader onClose={onClose} title="Nhập hàng độc lập" />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetMeta}>
              Dùng khi Manager nhập hàng về kho mà không cần thông báo từ Sales.
            </Text>
            <Text style={styles.formLabel}>Chọn sản phẩm</Text>
            <View style={styles.productSearchBox}>
              <Ionicons color="#69756f" name="search-outline" size={18} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setProductSearch}
                placeholder="Tìm theo tên, SKU, thương hiệu..."
                placeholderTextColor="#8a948f"
                style={styles.productSearchInput}
                value={productSearch}
              />
              {productSearch ? (
                <Pressable onPress={() => setProductSearch("")}>
                  <Ionicons color="#69756f" name="close-circle" size={19} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.resultCountText}>
              {productResultText}
            </Text>
            <View style={styles.productPickerList}>
              {isSearchingProducts ? (
                <View style={styles.productEmptyBox}>
                  <ActivityIndicator color="#2d5a4b" />
                  <Text style={styles.emptyText}>Đang tìm sản phẩm...</Text>
                </View>
              ) : productOptions.length ? (
                productOptions.map((item) => {
                const isSelected =
                  selectedProduct?.product._id === item.product._id;

                return (
                  <Pressable
                    key={item.product._id}
                    onPress={() => setSelectedProduct(item)}
                    style={[
                      styles.productPickerRow,
                      isSelected && styles.productPickerRowActive,
                    ]}
                  >
                    <View style={styles.cardCopy}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {item.product.brand} · {item.product.category}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons color="#2d5a4b" name="checkmark-circle" size={21} />
                    ) : null}
                  </Pressable>
                );
                })
              ) : (
                <View style={styles.productEmptyBox}>
                  <Ionicons color="#69756f" name="cube-outline" size={22} />
                  <Text style={styles.emptyText}>Không tìm thấy sản phẩm phù hợp.</Text>
                </View>
              )}
            </View>

            {selectedProduct ? (
              <View style={styles.selectedProductBox}>
                <Text style={styles.formLabel}>Tồn hiện tại tại {currentStoreName}</Text>
                <Text style={styles.selectedProductStock}>{currentStock} khả dụng</Text>
              </View>
            ) : null}

            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                setQuantity(
                  normalizeQuantityValue(value, {
                    max: MAX_STOCK_RECEIVE_QUANTITY,
                  })
                )
              }
              placeholder="Số lượng hàng về kho"
              placeholderTextColor="#8a948f"
              style={styles.input}
              value={quantity}
            />
            <Text style={styles.sheetHint}>
              Tối đa mỗi lần nhập: {MAX_STOCK_RECEIVE_QUANTITY}
            </Text>
            <QuantityStepper
              maxQuantity={MAX_STOCK_RECEIVE_QUANTITY}
              quantity={quantity}
              setQuantity={setQuantity}
            />
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Ghi chú nhập hàng"
              placeholderTextColor="#8a948f"
              style={[styles.input, styles.noteInput]}
              value={note}
            />
            <Pressable
              disabled={!selectedProduct || isProcessing}
              onPress={onConfirm}
              style={[styles.primaryButton, !selectedProduct && styles.disabledButton]}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Cộng tồn kho</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WriteOffModal({
  currentStoreId,
  currentStoreName,
  isProcessing,
  note,
  onClose,
  onConfirm,
  products,
  quantity,
  selectedProduct,
  setNote,
  setQuantity,
  setSelectedProduct,
  setType,
  token,
  type,
  visible,
}: {
  currentStoreId: string;
  currentStoreName: string;
  isProcessing: boolean;
  note: string;
  onClose: () => void;
  onConfirm: () => void;
  products: ProductInventory[];
  quantity: string;
  selectedProduct: ProductInventory | null;
  setNote: (value: string) => void;
  setQuantity: (value: string) => void;
  setSelectedProduct: (product: ProductInventory) => void;
  setType: (value: InventoryAdjustmentType) => void;
  token: string | null;
  type: InventoryAdjustmentType;
  visible: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductInventory[]>(products);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const currentStoreInventory = selectedProduct?.inventories.find(
    (inventory) => String(inventory.store._id) === currentStoreId
  );
  const currentStock = currentStoreInventory?.availableStock || 0;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const keyword = productSearch.trim().toLowerCase();

    if (!token) {
      setProductOptions(products);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingProducts(true);
        const nextProducts = await getProductInventory(token, {
          limit: PRODUCT_PICKER_LIMIT,
          search: keyword || undefined,
        });

        if (!isCancelled) {
          setProductOptions(nextProducts);
        }
      } catch {
        if (!isCancelled) {
          setProductOptions(keyword ? [] : products);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingProducts(false);
        }
      }
    }, keyword ? 250 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [productSearch, products, token, visible]);

  const productResultText = productSearch.trim()
    ? `Đang hiện tối đa ${PRODUCT_PICKER_LIMIT} kết quả phù hợp`
    : `Đang hiện ${productOptions.length} sản phẩm mới nhất. Tìm tên hoặc SKU để chọn nhanh.`;

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.sheet}>
          <SheetHeader onClose={onClose} title="Trừ hàng lỗi / hết hạn" />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetMeta}>
              Dùng khi kiểm kê phát hiện hàng lỗi, hỏng, mất mát hoặc hết hạn.
            </Text>
            <Text style={styles.formLabel}>Chọn sản phẩm cần trừ</Text>
            <View style={styles.productSearchBox}>
              <Ionicons color="#69756f" name="search-outline" size={18} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setProductSearch}
                placeholder="Tìm theo tên, SKU, thương hiệu..."
                placeholderTextColor="#8a948f"
                style={styles.productSearchInput}
                value={productSearch}
              />
              {productSearch ? (
                <Pressable onPress={() => setProductSearch("")}>
                  <Ionicons color="#69756f" name="close-circle" size={19} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.resultCountText}>{productResultText}</Text>
            <View style={styles.productPickerList}>
              {isSearchingProducts ? (
                <View style={styles.productEmptyBox}>
                  <ActivityIndicator color="#2d5a4b" />
                  <Text style={styles.emptyText}>Đang tìm sản phẩm...</Text>
                </View>
              ) : productOptions.length ? (
                productOptions.map((item) => {
                  const isSelected =
                    selectedProduct?.product._id === item.product._id;

                  return (
                    <Pressable
                      key={item.product._id}
                      onPress={() => setSelectedProduct(item)}
                      style={[
                        styles.productPickerRow,
                        isSelected && styles.productPickerRowActive,
                      ]}
                    >
                      <View style={styles.cardCopy}>
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {item.product.brand} · {item.product.category}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons color="#2d5a4b" name="checkmark-circle" size={21} />
                      ) : null}
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.productEmptyBox}>
                  <Ionicons color="#69756f" name="cube-outline" size={22} />
                  <Text style={styles.emptyText}>Không tìm thấy sản phẩm phù hợp.</Text>
                </View>
              )}
            </View>

            {selectedProduct ? (
              <View style={styles.selectedProductBox}>
                <Text style={styles.formLabel}>Tồn hiện tại tại {currentStoreName}</Text>
                <Text style={styles.selectedProductStock}>{currentStock} khả dụng</Text>
              </View>
            ) : null}

            <Text style={styles.formLabel}>Lý do trừ kho</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(ADJUSTMENT_LABELS) as InventoryAdjustmentType[]).map(
                (item) => (
                  <Pressable
                    key={item}
                    onPress={() => setType(item)}
                    style={[
                      styles.typeChip,
                      type === item && styles.typeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        type === item && styles.typeChipTextActive,
                      ]}
                    >
                      {ADJUSTMENT_LABELS[item]}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ""))}
              placeholder="Số lượng cần trừ kho"
              placeholderTextColor="#8a948f"
              style={styles.input}
              value={quantity}
            />
            <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Ghi chú kiểm kê"
              placeholderTextColor="#8a948f"
              style={[styles.input, styles.noteInput]}
              value={note}
            />
            <Pressable
              disabled={!selectedProduct || isProcessing}
              onPress={onConfirm}
              style={[
                styles.dangerButton,
                !selectedProduct && styles.disabledButton,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Ghi nhận và trừ kho</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AdjustmentModal({
  alert,
  isProcessing,
  note,
  onClose,
  onConfirm,
  quantity,
  setNote,
  setQuantity,
  setType,
  type,
}: {
  alert: InventoryAlert | null;
  isProcessing: boolean;
  note: string;
  onClose: () => void;
  onConfirm: () => void;
  quantity: string;
  setNote: (value: string) => void;
  setQuantity: (value: string) => void;
  setType: (value: InventoryAdjustmentType) => void;
  type: InventoryAdjustmentType;
}) {
  return (
    <Modal animationType="slide" transparent visible={Boolean(alert)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.sheet}>
          <SheetHeader onClose={onClose} title="Báo cáo kiểm kê" />
          {alert ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetProduct}>{alert.product.name}</Text>
              <Text style={styles.sheetMeta}>Tồn khả dụng: {alert.availableStock}</Text>
              <View style={styles.typeGrid}>
                {(Object.keys(ADJUSTMENT_LABELS) as InventoryAdjustmentType[]).map(
                  (item) => (
                    <Pressable
                      key={item}
                      onPress={() => setType(item)}
                      style={[
                        styles.typeChip,
                        type === item && styles.typeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          type === item && styles.typeChipTextActive,
                        ]}
                      >
                        {ADJUSTMENT_LABELS[item]}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ""))}
                placeholder="Số lượng cần trừ kho"
                placeholderTextColor="#8a948f"
                style={styles.input}
                value={quantity}
              />
              <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
              <TextInput
                multiline
                onChangeText={setNote}
                placeholder="Ghi chú kiểm kê"
                placeholderTextColor="#8a948f"
                style={[styles.input, styles.noteInput]}
                value={note}
              />
              <Pressable
                disabled={isProcessing}
                onPress={onConfirm}
                style={styles.dangerButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Ghi nhận và trừ kho</Text>
                )}
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetHeader({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Ionicons color="#252525" name="close" size={20} />
      </Pressable>
    </View>
  );
}

function QuantityStepper({
  maxQuantity,
  quantity,
  setQuantity,
}: {
  maxQuantity?: number;
  quantity: string;
  setQuantity: (value: string) => void;
}) {
  const currentQuantity = Math.max(1, Number.parseInt(quantity || "1", 10) || 1);
  const canIncrease = !maxQuantity || currentQuantity < maxQuantity;

  return (
    <View style={styles.quantityStepper}>
      <Pressable
        onPress={() => setQuantity(String(Math.max(1, currentQuantity - 1)))}
        style={styles.quantityStepButton}
      >
        <Ionicons color="#252525" name="remove" size={17} />
      </Pressable>
      <Text style={styles.quantityStepValue}>{currentQuantity}</Text>
      <Pressable
        disabled={!canIncrease}
        onPress={() =>
          setQuantity(String(maxQuantity ? Math.min(currentQuantity + 1, maxQuantity) : currentQuantity + 1))
        }
        style={styles.quantityStepButton}
      >
        <Ionicons color={canIncrease ? "#252525" : "#9aa6a0"} name="add" size={17} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  summaryPanel: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  metricBox: {
    flex: 1,
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: { color: "#1f2522", fontSize: 20, fontWeight: "900" },
  metricLabel: { marginTop: 3, color: "#69756f", fontSize: 10, fontWeight: "800" },
  managerFlowPanel: {
    gap: 11,
    marginTop: 12,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#1f2522",
  },
  managerFlowTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  managerFlowHeader: {
    alignItems: "stretch",
    gap: 10,
  },
  managerFlowActions: {
    flexDirection: "row",
    gap: 7,
  },
  directReceiveButton: {
    flex: 1,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  directReceiveButtonText: {
    color: "#252525",
    fontSize: 12,
    fontWeight: "900",
  },
  writeOffButton: {
    flex: 1,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fff1f3",
  },
  writeOffButtonText: {
    color: "#9f2639",
    fontSize: 12,
    fontWeight: "900",
  },
  managerFlowGrid: {
    flexDirection: "row",
    gap: 8,
  },
  managerFlowStep: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  managerFlowText: {
    color: "#52605a",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  alertToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -2,
    marginBottom: 10,
  },
  alertToolbarButton: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6ddd8",
  },
  alertToolbarButtonText: {
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
  cardList: { gap: 9 },
  alertCard: {
    minHeight: 76,
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
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  cardMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  smallAction: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  smallActionText: { color: "#252525", fontSize: 11, fontWeight: "900" },
  requestCard: {
    gap: 11,
    marginBottom: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readStatusPill: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: "#fff7eb",
  },
  readStatusPillDone: {
    backgroundColor: "#eef4ef",
  },
  readStatusText: {
    color: "#9a6b13",
    fontSize: 10,
    fontWeight: "900",
  },
  readStatusTextDone: {
    color: "#2d5a4b",
  },
  quantityBox: {
    width: 72,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  quantityValue: { color: "#2d5a4b", fontSize: 18, fontWeight: "900" },
  quantityLabel: { color: "#2d5a4b", fontSize: 10, fontWeight: "900" },
  reasonText: {
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  requestActionRow: {
    flexDirection: "row",
    gap: 9,
  },
  itemText: {
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  adjustmentRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyPanel: {
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  primaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9dfd8",
  },
  secondaryButtonText: {
    color: "#252525",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelRequestButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#fff1f3",
    borderWidth: 1,
    borderColor: "#f1c5cd",
  },
  cancelRequestButtonText: {
    color: "#9f2639",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: { opacity: 0.55 },
  dangerButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#9f2639",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheet: {
    width: "100%",
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
    gap: 12,
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
  sheetProduct: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  sheetMeta: {
    marginTop: 5,
    marginBottom: 12,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  sheetHint: {
    marginTop: 8,
    marginBottom: 10,
    color: "#52605a",
    fontSize: 12,
    fontWeight: "800",
  },
  formLabel: {
    marginBottom: 7,
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
  productPickerList: {
    gap: 8,
    marginBottom: 12,
  },
  productSearchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  productSearchInput: {
    flex: 1,
    minHeight: 44,
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "800",
  },
  resultCountText: {
    marginBottom: 8,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "800",
  },
  productEmptyBox: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  productPickerRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  productPickerRowActive: {
    backgroundColor: "#eef4ef",
    borderColor: "#9fb8ad",
  },
  selectedProductBox: {
    marginBottom: 10,
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  selectedProductStock: {
    color: "#2d5a4b",
    fontSize: 15,
    fontWeight: "900",
  },
  input: {
    minHeight: 46,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
    color: "#1f2522",
    fontWeight: "800",
  },
  quantityStepper: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#f1f4ef",
  },
  quantityStepButton: {
    width: 56,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityStepValue: {
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  noteInput: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  typeChipActive: {
    backgroundColor: "#252525",
    borderColor: "#252525",
  },
  typeChipText: { color: "#52605a", fontSize: 12, fontWeight: "900" },
  typeChipTextActive: { color: "#ffffff" },
});


