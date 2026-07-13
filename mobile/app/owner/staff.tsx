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
  createOwnerStaff,
  getOwnerStaff,
  getOwnerStores,
  updateOwnerStaff,
} from "@/services/ownerService";
import { ManagedStaff, ManagedStore, OwnerStaffPayload } from "@/types/owner";

type StaffFormState = {
  address: string;
  disabledReason: string;
  email: string;
  fullName: string;
  isActive: boolean;
  password: string;
  phone: string;
  role: "OWNER" | "MANAGER" | "SALES";
  storeId: string;
};

const EMPTY_FORM: StaffFormState = {
  address: "",
  disabledReason: "",
  email: "",
  fullName: "",
  isActive: true,
  password: "",
  phone: "",
  role: "MANAGER",
  storeId: "",
};

const resolveStoreId = (staff: ManagedStaff) =>
  typeof staff.storeId === "string" ? staff.storeId : staff.storeId?._id || "";

const resolveStoreName = (staff: ManagedStaff) =>
  typeof staff.storeId === "string" ? "" : staff.storeId?.name || "";

export default function OwnerStaffScreen() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<ManagedStaff[]>([]);
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<ManagedStaff | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        return;
      }

      try {
        mode === "refresh" ? setIsRefreshing(true) : setIsLoading(true);
        const [nextStaff, nextStores] = await Promise.all([
          getOwnerStaff(token, true),
          getOwnerStores(token, false),
        ]);
        setStaff(nextStaff);
        setStores(nextStores);
      } catch (error) {
        Alert.alert("Không tải được nhân sự", getErrorMessage(error));
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

  const openCreateModal = () => {
    setSelectedStaff(null);
    setForm({
      ...EMPTY_FORM,
      storeId: stores[0]?._id || "",
    });
    setIsModalVisible(true);
  };

  const openEditModal = (member: ManagedStaff) => {
    setSelectedStaff(member);
    setForm({
      address: member.address || "",
      disabledReason: member.disabledReason || "",
      email: member.email,
      fullName: member.fullName,
      isActive: member.isActive,
      password: "",
      phone: member.phone || "",
      role: member.role,
      storeId: resolveStoreId(member),
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedStaff(null);
    setForm(EMPTY_FORM);
    setIsModalVisible(false);
  };

  const handleQuickToggle = async (member: ManagedStaff) => {
    if (!token) {
      return;
    }

    try {
      const updated = await updateOwnerStaff(token, member._id, {
        disabledReason: member.isActive ? "Disabled by owner" : "",
        isActive: !member.isActive,
      });
      setStaff((current) =>
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

    if (!form.fullName || !form.email || !form.phone || !form.address) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đủ họ tên, email, số điện thoại và địa chỉ.");
      return;
    }

    if (!selectedStaff && !form.password) {
      Alert.alert("Thiếu mật khẩu", "Tài khoản mới cần có mật khẩu đăng nhập.");
      return;
    }

    if ((form.role === "MANAGER" || form.role === "SALES") && !form.storeId) {
      Alert.alert("Thiếu cửa hàng", "Manager hoặc Sales cần được gán cửa hàng.");
      return;
    }

    const payload: OwnerStaffPayload = {
      address: form.address,
      disabledReason: form.disabledReason,
      email: form.email,
      fullName: form.fullName,
      isActive: form.isActive,
      phone: form.phone,
      role: form.role,
      storeId: form.role === "OWNER" ? null : form.storeId,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      setIsSaving(true);

      if (selectedStaff) {
        const updated = await updateOwnerStaff(token, selectedStaff._id, payload);
        setStaff((current) =>
          current.map((item) => (item._id === updated._id ? updated : item))
        );
      } else {
        const created = await createOwnerStaff(token, payload);
        setStaff((current) => [created, ...current]);
      }

      closeModal();
    } catch (error) {
      Alert.alert("Không lưu được tài khoản", getErrorMessage(error));
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
          <Text style={styles.eyebrow}>STAFF OWNER</Text>
          <Text style={styles.title}>Quản lý nhân sự</Text>
          <Text style={styles.subtitle}>
            Tạo tài khoản, phân quyền và kiểm soát trạng thái hoạt động
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#252525" />
          <Text style={styles.mutedText}>Đang tải dữ liệu nhân sự...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#252525"
              onRefresh={() => loadData("refresh")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={openCreateModal} style={styles.primaryAction}>
            <Ionicons color="#ffffff" name="person-add-outline" size={18} />
            <Text style={styles.primaryActionText}>Tạo tài khoản nhân sự</Text>
          </Pressable>

          <View style={styles.summaryRow}>
            <SummaryCard
              label="Đang hoạt động"
              value={String(staff.filter((item) => item.isActive).length)}
            />
            <SummaryCard
              label="Đã khóa"
              value={String(staff.filter((item) => !item.isActive).length)}
            />
          </View>

          <View style={styles.cardList}>
            {staff.map((member) => (
              <View key={member._id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberMeta}>
                      {member.role} · {member.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      member.isActive ? styles.statusPillActive : styles.statusPillMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        member.isActive ? styles.statusTextActive : styles.statusTextMuted,
                      ]}
                    >
                      {member.isActive ? "Active" : "Locked"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.infoLine}>{member.phone || "Chưa có số điện thoại"}</Text>
                <Text style={styles.infoLine}>
                  {member.role === "OWNER"
                    ? "Toàn chuỗi"
                    : resolveStoreName(member) || "Chưa gán cửa hàng"}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => openEditModal(member)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Chỉnh sửa</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleQuickToggle(member)}
                    style={[
                      styles.secondaryButton,
                      !member.isActive && styles.secondaryButtonDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        !member.isActive && styles.secondaryButtonDangerText,
                      ]}
                    >
                      {member.isActive ? "Khóa tài khoản" : "Mở lại"}
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
                {selectedStaff ? "Cập nhật nhân sự" : "Tạo tài khoản mới"}
              </Text>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <Ionicons color="#252525" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Họ tên" value={form.fullName} onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))} />
              <Input label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Input label="Số điện thoại" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Input label="Địa chỉ" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
              <Input label={selectedStaff ? "Mật khẩu mới (nếu đổi)" : "Mật khẩu"} value={form.password} secureTextEntry onChangeText={(value) => setForm((current) => ({ ...current, password: value }))} />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.typeRow}>
                {(["OWNER", "MANAGER", "SALES"] as const).map((role) => {
                  const active = form.role === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          role,
                          storeId:
                            role === "OWNER" ? "" : current.storeId || stores[0]?._id || "",
                        }))
                      }
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {form.role !== "OWNER" ? (
                <>
                  <Text style={styles.inputLabel}>Cửa hàng phụ trách</Text>
                  <View style={styles.storeList}>
                    {stores.map((store) => {
                      const active = form.storeId === store._id;
                      return (
                        <Pressable
                          key={store._id}
                          onPress={() => setForm((current) => ({ ...current, storeId: store._id }))}
                          style={[styles.storeChip, active && styles.storeChipActive]}
                        >
                          <Text style={[styles.storeChipText, active && styles.storeChipTextActive]}>
                            {store.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Cho phép đăng nhập</Text>
                <Switch
                  onValueChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
                  thumbColor="#ffffff"
                  trackColor={{ false: "#cbd5cf", true: "#2d5a4b" }}
                  value={form.isActive}
                />
              </View>

              {!form.isActive ? (
                <Input
                  label="Lý do khóa"
                  value={form.disabledReason}
                  onChangeText={(value) => setForm((current) => ({ ...current, disabledReason: value }))}
                />
              ) : null}

              <Pressable disabled={isSaving} onPress={handleSubmit} style={styles.submitButton}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedStaff ? "Lưu cập nhật" : "Tạo tài khoản"}
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
  secureTextEntry,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={styles.input}
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
  memberCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e7df",
  },
  memberHeader: { flexDirection: "row", gap: 10 },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: "#1f2522", fontSize: 15, fontWeight: "900" },
  memberMeta: { marginTop: 4, color: "#69756f", fontSize: 12, lineHeight: 18, fontWeight: "700" },
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
  storeList: { gap: 8, marginBottom: 12 },
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
  storeChipText: { color: "#52605a", fontSize: 12, fontWeight: "800" },
  storeChipTextActive: { color: "#2d5a4b" },
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
