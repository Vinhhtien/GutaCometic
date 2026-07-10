import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import {
  getInventoryAdjustments,
  getInventoryReceipts,
} from "@/services/inventoryService";
import {
  InventoryAdjustment,
  InventoryAdjustmentType,
  InventoryReceipt,
  InventoryReceiptSource,
} from "@/types/inventory";

type HistoryTab = "receipts" | "adjustments";
type HistoryItem = InventoryReceipt | InventoryAdjustment;

const receiptSourceLabel: Record<InventoryReceiptSource, string> = {
  DIRECT: "Nhập trực tiếp",
  SALES_REQUEST: "Từ yêu cầu Sales",
  TRANSFER: "Điều chuyển",
};

const adjustmentTypeLabel: Record<InventoryAdjustmentType, string> = {
  DAMAGED: "Hàng hỏng",
  DEFECTIVE: "Hàng lỗi",
  LOST: "Mất mát",
  EXPIRED: "Hết hạn",
  OTHER: "Khác",
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "Chưa có thời gian";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function ManagerInventoryHistoryScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<HistoryTab>("receipts");
  const [receipts, setReceipts] = useState<InventoryReceipt[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [nextReceipts, nextAdjustments] = await Promise.all([
          getInventoryReceipts(token),
          getInventoryAdjustments(token),
        ]);

        setReceipts(nextReceipts);
        setAdjustments(nextAdjustments);
      } catch (error) {
        Alert.alert("Không tải được lịch sử kho", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = useMemo(
    () => ({
      adjustmentQuantity: adjustments.reduce(
        (total, item) => total + item.quantity,
        0
      ),
      adjustments: adjustments.length,
      receiptQuantity: receipts.reduce((total, item) => total + item.quantity, 0),
      receipts: receipts.length,
    }),
    [adjustments, receipts]
  );

  const data: HistoryItem[] =
    activeTab === "receipts" ? receipts : adjustments;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>QUẢN LÝ KHO</Text>
          <Text style={styles.title}>Lịch sử nhập & trừ hàng</Text>
          <Text style={styles.subtitle}>
            Theo dõi các thay đổi tồn kho tại chi nhánh
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải lịch sử kho...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={data}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadHistory("refresh")}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.summaryGrid}>
                <MetricCard
                  label="Phiếu nhập"
                  value={summary.receipts}
                  tone="success"
                />
                <MetricCard
                  label="SL nhập"
                  value={`+${summary.receiptQuantity}`}
                  tone="success"
                />
                <MetricCard
                  label="Phiếu trừ"
                  value={summary.adjustments}
                  tone="danger"
                />
                <MetricCard
                  label="SL trừ"
                  value={`-${summary.adjustmentQuantity}`}
                  tone="danger"
                />
              </View>

              <View style={styles.tabs}>
                <TabButton
                  active={activeTab === "receipts"}
                  icon="arrow-down-circle-outline"
                  label="Nhập hàng"
                  onPress={() => setActiveTab("receipts")}
                />
                <TabButton
                  active={activeTab === "adjustments"}
                  icon="remove-circle-outline"
                  label="Trừ hàng"
                  onPress={() => setActiveTab("adjustments")}
                />
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                color="#7c8781"
                name={
                  activeTab === "receipts"
                    ? "archive-outline"
                    : "remove-circle-outline"
                }
                size={30}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "receipts"
                  ? "Chưa có lịch sử nhập hàng"
                  : "Chưa có lịch sử trừ hàng"}
              </Text>
              <Text style={styles.emptyText}>
                Khi manager nhập hàng hoặc ghi nhận hàng lỗi, hết hạn, dữ liệu sẽ
                xuất hiện tại đây.
              </Text>
            </View>
          }
          renderItem={({ item }) =>
            activeTab === "receipts" ? (
              <ReceiptCard receipt={item as InventoryReceipt} />
            ) : (
              <AdjustmentCard adjustment={item as InventoryAdjustment} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "danger" | "success";
  value: number | string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text
        style={[
          styles.metricValue,
          tone === "danger" ? styles.dangerText : styles.successText,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Ionicons color={active ? "#ffffff" : "#52605a"} name={icon} size={18} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReceiptCard({ receipt }: { receipt: InventoryReceipt }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconSuccess}>
          <Ionicons color="#2d5a4b" name="arrow-down" size={18} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {receipt.productId?.name || "Sản phẩm"}
          </Text>
          <Text style={styles.cardMeta}>
            {receipt.productId?.sku || "Không có SKU"} ·{" "}
            {receiptSourceLabel[receipt.source] || receipt.source}
          </Text>
        </View>
        <Text style={styles.quantityIn}>+{receipt.quantity}</Text>
      </View>
      <InfoRow
        icon="storefront-outline"
        text={receipt.storeId?.name || "Chi nhánh"}
      />
      <InfoRow
        icon="person-outline"
        text={`Người nhập: ${receipt.receivedBy?.fullName || "Không rõ"}`}
      />
      <InfoRow icon="time-outline" text={formatDateTime(receipt.createdAt)} />
      {receipt.note ? <Text style={styles.noteText}>{receipt.note}</Text> : null}
    </View>
  );
}

function AdjustmentCard({ adjustment }: { adjustment: InventoryAdjustment }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconDanger}>
          <Ionicons color="#9f2639" name="remove" size={18} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {adjustment.productId?.name || "Sản phẩm"}
          </Text>
          <Text style={styles.cardMeta}>
            {adjustment.productId?.sku || "Không có SKU"} ·{" "}
            {adjustmentTypeLabel[adjustment.type] || adjustment.type}
          </Text>
        </View>
        <Text style={styles.quantityOut}>-{adjustment.quantity}</Text>
      </View>
      <InfoRow
        icon="storefront-outline"
        text={adjustment.storeId?.name || "Chi nhánh"}
      />
      <InfoRow
        icon="person-outline"
        text={`Người ghi nhận: ${adjustment.createdBy?.fullName || "Không rõ"}`}
      />
      <InfoRow icon="time-outline" text={formatDateTime(adjustment.createdAt)} />
      {adjustment.note ? (
        <Text style={styles.noteText}>{adjustment.note}</Text>
      ) : null}
    </View>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color="#69756f" name={icon} size={14} />
      <Text style={styles.infoText}>{text}</Text>
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
    paddingBottom: 14,
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
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { marginTop: 3, color: "#1f2522", fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 3, color: "#69756f", fontSize: 13, fontWeight: "700" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "48.8%",
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: { fontSize: 22, fontWeight: "900" },
  metricLabel: { marginTop: 3, color: "#69756f", fontSize: 11, fontWeight: "800" },
  successText: { color: "#2d5a4b" },
  dangerText: { color: "#9f2639" },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
  },
  tabButtonActive: { backgroundColor: "#252525" },
  tabText: { color: "#52605a", fontSize: 13, fontWeight: "900" },
  tabTextActive: { color: "#ffffff" },
  historyCard: {
    gap: 8,
    marginTop: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 3,
  },
  cardIconSuccess: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  cardIconDanger: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fff1f3",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#1f2522", fontSize: 14, fontWeight: "900" },
  cardMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "700",
  },
  quantityIn: { color: "#2d5a4b", fontSize: 18, fontWeight: "900" },
  quantityOut: { color: "#9f2639", fontSize: 18, fontWeight: "900" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  infoText: { flex: 1, color: "#52605a", fontSize: 12, fontWeight: "700" },
  noteText: {
    marginTop: 3,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  emptyBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyTitle: { color: "#1f2522", fontSize: 17, fontWeight: "900" },
  emptyText: {
    color: "#69756f",
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "600",
  },
});
