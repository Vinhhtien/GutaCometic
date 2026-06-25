import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { updateProfile } from "@/services/userService";

export default function EditProfileScreen() {
  const { token, updateUserContext, user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setFullName(user.fullName ?? "");
        setPhone(user.phone ?? "");
        setAddress(user.address ?? "");
      }
    }, [user])
  );

  if (!user) {
    return null;
  }

  const isGoldMember = user.points >= 1000;
  const initials = user.fullName.trim().charAt(0).toUpperCase();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/customer/profile");
    }
  };

  const handleSave = async () => {
    if (!token || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await updateProfile(token, { fullName, phone, address });
      await updateUserContext(response.user);
      setIsSuccessVisible(true);
    } catch (error) {
      Alert.alert("Cập nhật thất bại", getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Pressable accessibilityLabel="Change avatar" style={styles.cameraButton}>
                <Ionicons color="#ffffff" name="camera" size={16} />
              </Pressable>
            </View>
            <Text style={styles.avatarHint}>Nhấn để thay đổi ảnh đại diện</Text>

            <View
              style={[
                styles.membershipBadge,
                isGoldMember
                  ? styles.membershipBadgeGold
                  : styles.membershipBadgeSilver,
              ]}
            >
              <Text style={styles.membershipEmoji}>👑</Text>
              <Text
                style={[
                  styles.membershipText,
                  isGoldMember
                    ? styles.membershipTextGold
                    : styles.membershipTextSilver,
                ]}
              >
                {isGoldMember ? "Thành viên Vàng" : "Thành viên Bạc"} ·{" "}
                {user.points} điểm
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>THÔNG TIN CƠ BẢN</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>HỌ VÀ TÊN</Text>
              <TextInput
                onChangeText={setFullName}
                style={styles.fieldValueInput}
                value={fullName}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.emailRow}>
                <Text style={styles.fieldValueDisabled} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>ĐÃ XÁC THỰC</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>SỐ ĐIỆN THOẠI</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhone}
                style={styles.fieldValueInput}
                value={phone}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>ĐỊA CHỈ GIAO HÀNG</Text>
          <View style={styles.card}>
            <View style={styles.addressHeader}>
              <Text style={styles.fieldLabel}>ĐỊA CHỈ NHẬN HÀNG</Text>
              <View style={styles.defaultBadge}>
                <Ionicons color="#747673" name="location" size={11} />
                <Text style={styles.defaultBadgeText}>Mặc định</Text>
              </View>
            </View>
            <TextInput
              multiline
              onChangeText={setAddress}
              style={styles.addressInput}
              value={address}
            />
          </View>

          <View style={styles.footerNote}>
            <Ionicons color="#9a9c98" name="shield-checkmark-outline" size={16} />
            <Text style={styles.footerNoteText}>
              Thông tin của bạn được bảo mật theo chính sách GUTA Cosmetic và
              không được chia sẻ cho bên thứ ba.
            </Text>
          </View>

          <Pressable
            disabled={isSaving}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsSuccessVisible(false)}
        transparent
        visible={isSuccessVisible}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons color="#2d5a4b" name="checkmark-circle" size={42} />
            </View>
            <Text style={styles.successTitle}>Thành công</Text>
            <Text style={styles.successMessage}>
              Bạn đã cập nhật thông tin thành công!
            </Text>
            <Pressable
              onPress={() => setIsSuccessVisible(false)}
              style={({ pressed }) => [
                styles.successButton,
                pressed && styles.successButtonPressed,
              ]}
            >
              <Text style={styles.successButtonText}>Xác nhận</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#2d5a4b",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
  },
  cameraButton: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f8fafc",
    borderRadius: 16,
    backgroundColor: "#3a3b39",
  },
  avatarHint: {
    marginTop: 12,
    color: "#9a9c98",
    fontSize: 12,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  membershipBadgeGold: {
    backgroundColor: "#fdf0d9",
  },
  membershipBadgeSilver: {
    backgroundColor: "#eceeec",
  },
  membershipEmoji: {
    fontSize: 12,
  },
  membershipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  membershipTextGold: {
    color: "#92660f",
  },
  membershipTextSilver: {
    color: "#5c5e5b",
  },
  sectionLabel: {
    marginBottom: 10,
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  card: {
    marginBottom: 22,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  field: {
    paddingVertical: 14,
  },
  fieldLabel: {
    color: "#9a9c98",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  fieldValueInput: {
    marginTop: 4,
    padding: 0,
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f1ee",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
  },
  fieldValueDisabled: {
    flex: 1,
    color: "#9a9c98",
    fontSize: 17,
    fontWeight: "800",
  },
  verifiedBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#eceeec",
  },
  verifiedBadgeText: {
    color: "#6f716e",
    fontSize: 10,
    fontWeight: "800",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  defaultBadgeText: {
    color: "#747673",
    fontSize: 11,
    fontWeight: "700",
  },
  addressInput: {
    marginTop: 6,
    marginBottom: 14,
    padding: 0,
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 26,
    paddingHorizontal: 4,
  },
  footerNoteText: {
    flex: 1,
    color: "#9a9c98",
    fontSize: 12,
    lineHeight: 17,
  },
  saveButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2d5a4b",
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  successOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  successCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: "#ffffff",
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    color: "#252525",
    fontSize: 17,
    fontWeight: "800",
  },
  successMessage: {
    marginTop: 8,
    marginBottom: 20,
    color: "#5c5e5b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  successButton: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2d5a4b",
  },
  successButtonPressed: {
    opacity: 0.85,
  },
  successButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
