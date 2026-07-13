import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import {
  createOwnerStore,
  getOwnerStores,
  updateOwnerStore,
} from "@/services/ownerService";
import { ManagedStore, OwnerStorePayload } from "@/types/owner";

type StoreFormState = {
  address: string;
  isActive: boolean;
  name: string;
  phone: string;
  type: "CENTRAL" | "BRANCH";
};

const EMPTY_FORM: StoreFormState = {
  address: "",
  isActive: true,
  name: "",
  phone: "",
  type: "BRANCH",
};

export default function OwnerStoresScreen() {
  const { token } = useAuth();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<ManagedStore | null>(null);
  const [form, setForm] = useState<StoreFormState>(EMPTY_FORM);

  const loadStores = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const nextStores = await getOwnerStores(token, true);
        setStores(nextStores);
      } catch (error) {
        Alert.alert("Không tải được cửa hàng", getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const openCreateModal = () => {
    setSelectedStore(null);
    setForm(EMPTY_FORM);
    setIsModalVisible(true);
  };

  const openEditModal = (store: ManagedStore) => {
    setSelectedStore(store);
    setForm({
      address: store.address,
      isActive: store.isActive,
      name: store.name,
      phone: store.phone,
      type: store.type === "CENTRAL" ? "CENTRAL" : "BRANCH",
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedStore(null);
    setForm(EMPTY_FORM);
    setIsModalVisible(false);
  };

  const handleQuickToggle = async (store: ManagedStore) => {
    if (!token) {
      return;
    }

    try {
      const updated = await updateOwnerStore(token, store._id, {
        isActive: !store.isActive,
      });
      setStores((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
    } catch (error) {
      Alert.alert("Không đổi được trạng thái", getErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }

    if (!form.name || !form.address || !form.phone) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên, địa chỉ và số điện thoại.");
      return;
    }

    const payload: OwnerStorePayload = {
      address: form.address,
      isActive: form.isActive,
      name: form.name,
      phone: form.phone,
      type: form.type,
    };

    try {
      setIsSaving(true);

      if (selectedStore) {
        const updated = await updateOwnerStore(token, selectedStore._id, payload);
        setStores((current) =>
          current.map((item) => (item._id === updated._id ? updated : item))
        );
      } else {
        const created = await createOwnerStore(token, payload);
        setStores((current) => [created, ...current]);
      }

      closeModal();
    } catch (error) {
      Alert.alert("Không lưu được cửa hàng", getErrorMessage(error));
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
          <Text style={styles.eyebrow}>STORE OWNER</Text>
          <Text style={styles.title}>Quản lý cửa hàng</Text>
          <Text style={styles.subtitle}>Thêm, sửa, khóa và mở lại cửa hàng trong chuỗi</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải danh sách cửa hàng...</Text>
        </View>
      ) : (
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
          <Pressable onPress={openCreateModal} style={styles.primaryAction}>
            <Ionicons color="#ffffff" name="add" size={18} />
            <Text style={styles.primaryActionText}>Thêm cửa hàng mới</Text>
          </Pressable>

          <View style={styles.summaryRow}>
            <SummaryCard
              label="Đang hoạt động"
              value={String(stores.filter((item) => item.isActive).length)}
            />
            <SummaryCard
              label="Đang khóa"
              value={String(stores.filter((item) => !item.isActive).length)}
            />
          </View>

          <View style={styles.cardList}>
            {stores.map((store) => (
              <View key={store._id} style={styles.storeCard}>
                <View style={styles.storeHeader}>
                  <View style={styles.storeCopy}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeMeta}>
                      {store.type === "CENTRAL" ? "Kho tổng" : "Chi nhánh"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      store.isActive ? styles.statusPillActive : styles.statusPillMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        store.isActive ? styles.statusTextActive : styles.statusTextMuted,
                      ]}
                    >
                      {store.isActive ? "Mở" : "Khóa"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.infoLine}>{store.address}</Text>
                <Text style={styles.infoLine}>{store.phone}</Text>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => openEditModal(store)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Chỉnh sửa</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleQuickToggle(store)}
                    style={[
                      styles.secondaryButton,
                      !store.isActive && styles.secondaryButtonDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        !store.isActive && styles.secondaryButtonDangerText,
                      ]}
                    >
                      {store.isActive ? "Khóa store" : "Mở lại"}
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
                {selectedStore ? "Cập nhật cửa hàng" : "Tạo cửa hàng mới"}
              </Text>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <Ionicons color="#252525" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Tên cửa hàng" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Input label="Địa chỉ" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
              <Input label="Số điện thoại" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />

              <Text style={styles.inputLabel}>Loại cửa hàng</Text>
              <View style={styles.typeRow}>
                {(["CENTRAL", "BRANCH"] as const).map((type) => {
                  const active = form.type === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setForm((current) => ({ ...current, type }))}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {type === "CENTRAL" ? "Kho tổng" : "Chi nhánh"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Cho phép hoạt động</Text>
                <Switch
                  onValueChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
                  thumbColor="#ffffff"
                  trackColor={{ false: "#cbd5cf", true: "#2d5a4b" }}
                  value={form.isActive}
                />
              </View>

              <Pressable disabled={isSaving} onPress={handleSubmit} style={styles.submitButton}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedStore ? "Lưu thay đổi" : "Tạo cửa hàng"}
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
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput onChangeText={onChangeText} style={styles.input} value={value} />
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
  storeCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  storeHeader: { flexDirection: "row", gap: 10 },
  storeCopy: { flex: 1, minWidth: 0 },
  storeName: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  storeMeta: { marginTop: 4, color: "#69756f", fontSize: 12, fontWeight: "700" },
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
  infoLine: { marginTop: 8, color: "#52605a", fontSize: 12, lineHeight: 18, fontWeight: "700" },
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
    maxHeight: "90%",
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
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeChip: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingVertical: 10,
  },
  switchLabel: { color: "#1f2522", fontSize: 13, fontWeight: "800" },
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  submitButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
});
