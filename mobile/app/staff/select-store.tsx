import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isStaffRole } from "@/constants/session";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getStores } from "@/services/storeService";
import { Store } from "@/types/store";
import { getHomeRouteForRole } from "@/utils/roleNavigation";

export default function StaffStoreSelectScreen() {
  const { activeStore, isLoading, logout, selectActiveStore, token, user } =
    useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(activeStore?._id || "");

  const loadStores = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsFetching(true);
        const response = await getStores(token);
        setStores(response);
        setSelectedId((current) => current || activeStore?._id || response[0]?._id || "");
      } catch (error) {
        Alert.alert("Không tải được chi nhánh", getErrorMessage(error));
      } finally {
        setIsFetching(false);
        setIsRefreshing(false);
      }
    },
    [activeStore?._id, token]
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login");
      return;
    }

    if (!isLoading && user && !isStaffRole(user.role)) {
      router.replace(getHomeRouteForRole(user.role));
    }
  }, [isLoading, user]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const handleConfirm = async () => {
    const store = stores.find((item) => item._id === selectedId);

    if (!store) {
      Alert.alert(
        "Chưa chọn chi nhánh",
        "Vui lòng chọn chi nhánh đang làm việc trước khi vào hệ thống."
      );
      return;
    }

    await selectActiveStore(store);
    router.replace(getHomeRouteForRole(user?.role));
  };

  if (isLoading || isFetching) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải danh sách chi nhánh...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GUTA COSMETIC</Text>
          <Text style={styles.title}>Chọn chi nhánh làm việc</Text>
          <Text style={styles.subtitle}>
            Mọi đơn hàng, POS và kiểm kho sẽ được xử lý tại chi nhánh này.
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.iconButton}>
          <Ionicons color="#252525" name="log-out-outline" size={21} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#252525"
            onRefresh={() => loadStores("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.noticeBox}>
          <Ionicons color="#2d5a4b" name="shield-checkmark-outline" size={20} />
          <Text style={styles.noticeText}>
            Sau khi chọn, hệ thống chỉ hiển thị và xử lý dữ liệu của chi nhánh
            đang sử dụng.
          </Text>
        </View>

        {stores.map((store) => {
          const isSelected = store._id === selectedId;

          return (
            <Pressable
              key={store._id}
              onPress={() => setSelectedId(store._id)}
              style={[styles.storeCard, isSelected && styles.storeCardActive]}
            >
              <View
                style={[styles.storeIcon, isSelected && styles.storeIconActive]}
              >
                <Ionicons
                  color={isSelected ? "#ffffff" : "#2d5a4b"}
                  name="storefront-outline"
                  size={22}
                />
              </View>
              <View style={styles.storeCopy}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeAddress}>{store.address}</Text>
                <Text style={styles.storeMeta}>{store.phone}</Text>
              </View>
              <Ionicons
                color={isSelected ? "#2d5a4b" : "#c8cfca"}
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={23}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleConfirm} style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Vào chi nhánh này</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={18} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7f4" },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: { color: "#69756f", fontSize: 13, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#60716a", fontSize: 11, fontWeight: "900" },
  title: {
    marginTop: 3,
    color: "#1f2522",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 5,
    color: "#69756f",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
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
  content: { gap: 10, paddingHorizontal: 18, paddingBottom: 30 },
  noticeBox: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
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
  storeCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeCardActive: { borderColor: "#2d5a4b", backgroundColor: "#fbfdfb" },
  storeIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eef4ef",
  },
  storeIconActive: { backgroundColor: "#2d5a4b" },
  storeCopy: { flex: 1, minWidth: 0 },
  storeName: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  storeAddress: {
    marginTop: 4,
    color: "#69756f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  storeMeta: {
    marginTop: 3,
    color: "#52605a",
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#e2e7df",
    backgroundColor: "#ffffff",
  },
  confirmButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  confirmButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
});
