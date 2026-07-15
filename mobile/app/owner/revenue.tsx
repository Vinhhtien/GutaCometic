import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getOwnerRevenueAnalytics } from "@/services/ownerService";
import { OwnerRevenueAnalytics } from "@/types/owner";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export default function OwnerRevenueScreen() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<OwnerRevenueAnalytics | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = useCallback(
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
        setErrorMessage("");
        const nextAnalytics = await getOwnerRevenueAnalytics(token);
        setAnalytics(nextAnalytics);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary;
  const stores = analytics?.stores || [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>OWNER ANALYTICS</Text>
          <Text style={styles.title}>Doanh thu, lời lỗ & tồn kho</Text>
          <Text style={styles.subtitle}>
            Kết hợp doanh thu đã thu, giá vốn, hao hụt và giá trị hàng còn trong kho
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tổng hợp số liệu tài chính...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadAnalytics("refresh")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.errorPanel}>
              <Ionicons color="#9f2639" name="alert-circle-outline" size={18} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {summary ? (
            <>
              <View style={styles.heroPanel}>
                <Text style={styles.heroLabel}>Doanh thu đã thanh toán</Text>
                <Text style={styles.heroValue}>{formatCurrency(summary.paidRevenue)}</Text>
                <Text style={styles.heroMeta}>
                  {summary.paidOrders} đơn đã thu tiền trên tổng {summary.totalOrders} đơn
                </Text>
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="Lãi gộp"
                  tone="success"
                  value={formatCurrency(summary.grossProfit)}
                />
                <MetricCard
                  label="Lãi sau hao hụt"
                  tone={summary.estimatedNetProfit >= 0 ? "success" : "danger"}
                  value={formatCurrency(summary.estimatedNetProfit)}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="Giá vốn đã bán"
                  tone="neutral"
                  value={formatCurrency(summary.soldCost)}
                />
                <MetricCard
                  label="Tồn kho hiện tại"
                  tone="neutral"
                  value={formatCurrency(summary.inventoryValue)}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="Nhập hàng đã ghi nhận"
                  tone="neutral"
                  value={formatCurrency(summary.stockInCost)}
                />
                <MetricCard
                  label="Hao hụt kiểm kê"
                  tone="danger"
                  value={formatCurrency(summary.writeOffCost)}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="Tháng này"
                  tone="neutral"
                  value={formatCurrency(summary.monthlyRevenue)}
                />
                <MetricCard
                  label="Lãi gộp tháng này"
                  tone={summary.monthlyGrossProfit >= 0 ? "success" : "danger"}
                  value={formatCurrency(summary.monthlyGrossProfit)}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                  label="TB mỗi đơn"
                  tone="neutral"
                  value={formatCurrency(summary.averageOrderValue)}
                />
                <MetricCard
                  label="Thiếu giá vốn"
                  tone={summary.missingCostProductCount > 0 ? "warning" : "success"}
                  value={String(summary.missingCostProductCount)}
                />
              </View>

              {summary.missingCostProductCount > 0 ? (
                <View style={styles.warningPanel}>
                  <Ionicons color="#9a6b13" name="warning-outline" size={18} />
                  <View style={styles.warningCopy}>
                    <Text style={styles.warningTitle}>Cần bổ sung giá vốn</Text>
                    <Text style={styles.warningText}>
                      Báo cáo lời lỗ sẽ chính xác hơn khi các sản phẩm này có giá nhập:
                      {" "}
                      {summary.missingCostProducts.join(", ")}
                      {summary.missingCostProductCount > summary.missingCostProducts.length
                        ? "..."
                        : ""}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Theo từng cửa hàng</Text>
              <View style={styles.cardList}>
                {stores.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyText}>Chưa có số liệu để tổng hợp.</Text>
                  </View>
                ) : (
                  stores.map((entry) => (
                    <View key={entry.store?._id || "unknown"} style={styles.storeCard}>
                      <View style={styles.storeHeader}>
                        <View style={styles.storeCopy}>
                          <Text style={styles.storeName}>
                            {entry.store?.name || "Cửa hàng không xác định"}
                          </Text>
                          <Text style={styles.storeMeta}>
                            {entry.paidOrderCount} đơn đã thu tiền
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.storeProfit,
                            entry.estimatedNetProfit >= 0
                              ? styles.successText
                              : styles.dangerText,
                          ]}
                        >
                          {formatCurrency(entry.estimatedNetProfit)}
                        </Text>
                      </View>

                      <InfoRow label="Doanh thu" value={formatCurrency(entry.revenue)} />
                      <InfoRow label="Online" value={formatCurrency(entry.onlineRevenue)} />
                      <InfoRow label="Tại quầy" value={formatCurrency(entry.offlineRevenue)} />
                      <InfoRow label="Giá vốn đã bán" value={formatCurrency(entry.soldCost)} />
                      <InfoRow label="Lãi gộp" value={formatCurrency(entry.grossProfit)} />
                      <InfoRow label="Hao hụt kiểm kê" value={formatCurrency(entry.writeOffCost)} />
                      <InfoRow label="Giá trị tồn kho" value={formatCurrency(entry.inventoryValue)} />
                      <InfoRow label="Số lượng tồn" value={`${entry.totalStockUnits}`} />
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyText}>Chưa lấy được dữ liệu tài chính.</Text>
            </View>
          )}
        </ScrollView>
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
  tone: "danger" | "neutral" | "success" | "warning";
  value: string;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        tone === "success"
          ? styles.metricCardSuccess
          : tone === "danger"
            ? styles.metricCardDanger
            : tone === "warning"
              ? styles.metricCardWarning
              : styles.metricCardNeutral,
      ]}
    >
      <Text
        style={[
          styles.metricValue,
          tone === "success"
            ? styles.successText
            : tone === "danger"
                ? styles.dangerText
              : tone === "warning"
                ? styles.warningValueText
                : styles.neutralText,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  header: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  headerCopy: { gap: 3 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: { color: "#1f2522", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  heroPanel: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#1f2522",
  },
  heroLabel: { color: "#c9d4ce", fontSize: 12, fontWeight: "900" },
  heroValue: { marginTop: 8, color: "#ffffff", fontSize: 28, fontWeight: "900" },
  heroMeta: { marginTop: 6, color: "#dbe4de", fontSize: 13, fontWeight: "700" },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metricCard: {
    flex: 1,
    minHeight: 88,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricCardNeutral: { backgroundColor: "#ffffff", borderColor: "#e2e7df" },
  metricCardSuccess: { backgroundColor: "#eef7f2", borderColor: "#cfe6d8" },
  metricCardDanger: { backgroundColor: "#fff1f3", borderColor: "#f4cbd3" },
  metricCardWarning: { backgroundColor: "#fff7e8", borderColor: "#f3dfae" },
  metricValue: { fontSize: 20, fontWeight: "900" },
  metricLabel: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "800" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: "#1f2522",
    fontSize: 17,
    fontWeight: "900",
  },
  cardList: { gap: 10 },
  storeCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  storeCopy: { flex: 1, gap: 2 },
  storeName: { color: "#1f2522", fontSize: 16, fontWeight: "900" },
  storeMeta: { color: "#69756f", fontSize: 12, fontWeight: "700" },
  storeProfit: { fontSize: 13, fontWeight: "900" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 5,
  },
  infoLabel: { color: "#52605a", fontSize: 12, fontWeight: "700" },
  infoValue: { color: "#1f2522", fontSize: 12, fontWeight: "900" },
  warningPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff7e8",
    borderWidth: 1,
    borderColor: "#f3dfae",
  },
  warningCopy: { flex: 1, gap: 4 },
  warningTitle: { color: "#7f5b07", fontSize: 13, fontWeight: "900" },
  warningText: { color: "#8c6820", fontSize: 12, fontWeight: "700" },
  errorPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff1f3",
    borderWidth: 1,
    borderColor: "#f4cbd3",
  },
  errorText: { flex: 1, color: "#9f2639", fontSize: 12, fontWeight: "800" },
  emptyPanel: {
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  emptyText: { color: "#69756f", fontSize: 13, fontWeight: "700", textAlign: "center" },
  successText: { color: "#2d5a4b" },
  dangerText: { color: "#9f2639" },
  warningValueText: { color: "#9a6b13" },
  neutralText: { color: "#1f2522" },
});
