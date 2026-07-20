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
  confirmIncomingTransfer,
  getIncomingTransfers,
} from "@/services/inventoryService";
import { IncomingStockTransfer } from "@/types/inventory";

type TransferStatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";

const STATUS_OPTIONS: TransferStatusFilter[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
];

const STATUS_LABELS: Record<TransferStatusFilter, string> = {
  ALL: "Tất cả",
  PENDING: "Chờ nhận",
  CONFIRMED: "Đã nhập",
  CANCELLED: "Đã hủy",
};

const formatDate = (isoDate?: string) => {
  if (!isoDate) {
    return "Chưa có thời gian";
  }

  return new Date(isoDate).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ManagerTransfersScreen() {
  const { activeStore, token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TransferStatusFilter>("ALL");
  const [transfers, setTransfers] = useState<IncomingStockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadTransfers = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        setError("");
        if (mode === "refresh") {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await getIncomingTransfers(token, {
          status: statusFilter,
        });
        setTransfers(response);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, token]
  );

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const summary = useMemo(
    () => ({
      confirmed: transfers.filter((transfer) => transfer.status === "CONFIRMED")
        .length,
      pending: transfers.filter((transfer) => transfer.status === "PENDING").length,
      totalUnits: transfers.reduce(
        (sum, transfer) =>
          sum +
          transfer.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
    }),
    [transfers]
  );

  const handleConfirmTransfer = async (transfer: IncomingStockTransfer) => {
    if (!token || processingId) {
      return;
    }

    try {
      setProcessingId(transfer._id);
      await confirmIncomingTransfer(token, transfer._id);
      await loadTransfers("refresh");
      Alert.alert(
        "Đã nhập phiếu điều chuyển",
        "Hàng chuyển đã được cộng vào tồn kho chi nhánh và lưu vào lịch sử nhập kho."
      );
    } catch (requestError) {
      Alert.alert(
        "Không xác nhận được điều chuyển",
        getErrorMessage(requestError)
      );
    } finally {
      setProcessingId(null);
    }
  };

  const renderTransfer = ({ item }: { item: IncomingStockTransfer }) => {
    const isProcessing = processingId === item._id;
    const itemCount = item.items.length;
    const unitCount = item.items.reduce((sum, product) => sum + product.quantity, 0);
    const isPending = item.status === "PENDING";
    const statusToneStyle =
      item.status === "CONFIRMED"
        ? styles.statusPillSuccess
        : item.status === "CANCELLED"
          ? styles.statusPillDanger
          : styles.statusPillPending;

    return (
      <View style={styles.transferCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons color="#252525" name="swap-horizontal-outline" size={20} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>
              {item.fromStoreId.name} {"->"} {item.toStoreId.name}
            </Text>
            <Text style={styles.cardMeta}>
              {itemCount} sản phẩm · {unitCount} đơn vị
            </Text>
            <Text style={styles.cardMeta}>
              Tạo lúc {formatDate(item.createdAt)}
              {item.createdBy?.fullName ? ` · ${item.createdBy.fullName}` : ""}
            </Text>
          </View>
          <View style={[styles.statusPill, statusToneStyle]}>
            <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        <View style={styles.itemList}>
          {item.items.map((product) => (
            <View key={`${item._id}-${product.productId._id}`} style={styles.itemRow}>
              <Text numberOfLines={1} style={styles.itemName}>
                {product.productId.name}
              </Text>
              <Text style={styles.itemQty}>x{product.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Ionicons color="#52605a" name="information-circle-outline" size={16} />
          <Text style={styles.noteText}>
            {isPending
              ? `Manager xác nhận phiếu này để hàng được nhập vào kho của ${activeStore?.name || "chi nhánh"}.`
              : item.status === "CONFIRMED"
                ? `Phiếu đã nhập kho lúc ${formatDate(item.updatedAt)}${item.confirmedBy?.fullName ? ` bởi ${item.confirmedBy.fullName}` : ""}.`
                : "Phiếu điều chuyển này đã bị hủy trước khi nhập kho."}
          </Text>
        </View>

        {isPending ? (
          <Pressable
            disabled={isProcessing}
            onPress={() => handleConfirmTransfer(item)}
            style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons color="#ffffff" name="checkmark-circle-outline" size={18} />
                <Text style={styles.primaryButtonText}>Xác nhận nhập điều chuyển</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PHIẾU ĐIỀU CHUYỂN</Text>
          <Text style={styles.title}>Nhập hàng điều chuyển</Text>
          <Text style={styles.subtitle}>
            {user?.fullName} · {activeStore?.name || "Chưa chọn chi nhánh"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải phiếu điều chuyển...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons color="#9f2639" name="alert-circle-outline" size={30} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadTransfers()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={transfers}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadTransfers("refresh")}
            />
          }
          renderItem={renderTransfer}
          ListHeaderComponent={
            <>
              <View style={styles.summaryPanel}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{summary.pending}</Text>
                  <Text style={styles.metricLabel}>Chờ manager nhận</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{summary.confirmed}</Text>
                  <Text style={styles.metricLabel}>Đã nhập kho</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{summary.totalUnits}</Text>
                  <Text style={styles.metricLabel}>Tổng đơn vị hàng</Text>
                </View>
              </View>

              <View style={styles.filterRow}>
                {STATUS_OPTIONS.map((option) => {
                  const isActive = option === statusFilter;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setStatusFilter(option)}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {STATUS_LABELS[option]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons color="#747673" name="file-tray-outline" size={34} />
              <Text style={styles.emptyTitle}>
                {statusFilter === "PENDING"
                  ? "Chưa có phiếu chờ nhận"
                  : statusFilter === "CONFIRMED"
                    ? "Chưa có phiếu đã nhập"
                    : statusFilter === "CANCELLED"
                      ? "Chưa có phiếu đã hủy"
                      : "Chưa có phiếu điều chuyển"}
              </Text>
              <Text style={styles.emptyText}>
                {statusFilter === "ALL"
                  ? "Phiếu điều chuyển từ admin hoặc owner sang chi nhánh sẽ xuất hiện tại đây để manager theo dõi đầy đủ trạng thái."
                  : "Đổi bộ lọc để xem thêm các phiếu điều chuyển khác của chi nhánh."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8f5",
  },
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
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#60716a",
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 23,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: "#69756f",
    fontSize: 13,
    fontWeight: "700",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  mutedText: {
    color: "#69756f",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: "#9f2639",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },
  summaryPanel: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 80,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: {
    color: "#1f2522",
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "800",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d8ddd8",
  },
  filterChipActive: {
    backgroundColor: "#252525",
    borderColor: "#252525",
  },
  filterChipText: {
    color: "#52605a",
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  transferCard: {
    gap: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f1f4ef",
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: "#1f2522",
    fontSize: 15,
    fontWeight: "900",
  },
  cardMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  statusPill: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusPillPending: {
    backgroundColor: "#fff7eb",
  },
  statusPillSuccess: {
    backgroundColor: "#eef4ef",
  },
  statusPillDanger: {
    backgroundColor: "#fff1f3",
  },
  statusText: {
    color: "#252525",
    fontSize: 10,
    fontWeight: "900",
  },
  itemList: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: "#edf0eb",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemName: {
    flex: 1,
    color: "#1f2522",
    fontSize: 13,
    fontWeight: "700",
  },
  itemQty: {
    color: "#52605a",
    fontSize: 13,
    fontWeight: "900",
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f7f8f5",
  },
  noteText: {
    flex: 1,
    color: "#52605a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 12,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    color: "#69756f",
    textAlign: "center",
    lineHeight: 19,
    fontSize: 13,
    fontWeight: "700",
  },
});
