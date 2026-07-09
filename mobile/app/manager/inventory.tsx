import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  getInventoryAlerts,
  getRestockRequests,
  updateRestockRequestStatus,
} from "@/services/inventoryService";
import {
  InventoryAlert,
  InventoryRestockRequest,
} from "@/types/inventory";

export default function ManagerInventoryScreen() {
  const { token, user } = useAuth();
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [requests, setRequests] = useState<InventoryRestockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [nextAlerts, nextRequests] = await Promise.all([
          getInventoryAlerts(token).catch(() => []),
          getRestockRequests(token, "OPEN").catch(() => []),
        ]);
        setAlerts(nextAlerts);
        setRequests(nextRequests);
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

  const resolveRequest = async (request: InventoryRestockRequest) => {
    if (!token || updatingRequestId) {
      return;
    }

    try {
      setUpdatingRequestId(request._id);
      await updateRestockRequestStatus(token, request._id, {
        status: "RESOLVED",
        managerNote: "Manager đã ghi nhận yêu cầu bổ sung hàng.",
      });
      setRequests((current) =>
        current.filter((item) => item._id !== request._id)
      );
      Alert.alert("Đã xử lý", "Yêu cầu bổ sung hàng đã được đóng.");
    } catch (error) {
      Alert.alert("Không xử lý được yêu cầu", getErrorMessage(error));
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const lowStockCount = alerts.filter((alert) => alert.type === "LOW_STOCK").length;
  const expiryCount = alerts.filter((alert) => alert.type !== "LOW_STOCK").length;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>KIỂM KHO CHI NHÁNH</Text>
          <Text style={styles.title}>Cảnh báo tồn kho</Text>
          <Text style={styles.subtitle}>{user?.fullName} · Thu ngân / Quản lý</Text>
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
                <MetricBox label="Sắp hết hàng" value={lowStockCount} />
                <MetricBox label="Hạn dùng" value={expiryCount} />
                <MetricBox label="Sales báo" value={requests.length} />
              </View>

              <Text style={styles.sectionTitle}>Cảnh báo hệ thống</Text>
              {alerts.length === 0 ? (
                <EmptyPanel text="Chưa có sản phẩm dưới 10 hoặc sắp hết hạn." />
              ) : (
                <View style={styles.alertList}>
                  {alerts.slice(0, 6).map((alert) => (
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
                      <View style={styles.alertCopy}>
                        <Text numberOfLines={2} style={styles.alertName}>
                          {alert.product.name}
                        </Text>
                        <Text style={styles.alertText}>
                          {alert.message} · Còn {alert.availableStock}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>Yêu cầu từ Sales</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyPanel text="Chưa có yêu cầu bổ sung hàng đang mở." />
          }
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.alertCopy}>
                  <Text numberOfLines={2} style={styles.requestTitle}>
                    {item.productId.name}
                  </Text>
                  <Text style={styles.requestMeta}>
                    {item.requestedBy.fullName} · Còn {item.currentAvailableStock}
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
              <Pressable
                disabled={updatingRequestId === item._id}
                onPress={() => resolveRequest(item)}
                style={styles.primaryButton}
              >
                {updatingRequestId === item._id ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons color="#ffffff" name="checkmark-circle-outline" size={18} />
                    <Text style={styles.primaryButtonText}>Đánh dấu đã xử lý</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  title: { color: "#1f2522", fontSize: 24, fontWeight: "900" },
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
    gap: 9,
    marginTop: 4,
  },
  metricBox: {
    flex: 1,
    minHeight: 72,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  metricValue: { color: "#1f2522", fontSize: 22, fontWeight: "900" },
  metricLabel: { marginTop: 3, color: "#69756f", fontSize: 11, fontWeight: "800" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 16,
    fontWeight: "900",
  },
  alertList: { gap: 9 },
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
  alertCopy: { flex: 1, minWidth: 0 },
  alertName: { color: "#1f2522", fontSize: 13, fontWeight: "900" },
  alertText: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
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
  requestTitle: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  requestMeta: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    fontWeight: "700",
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
  primaryButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
});
