import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

const quickActions = [
  { label: "Yêu thích", icon: "heart-outline" },
  { label: "Mã giảm giá", icon: "pricetag-outline" },
  { label: "Địa chỉ", icon: "location-outline" },
  { label: "Cài đặt", icon: "settings-outline" },
] as const;

const menuItems = [
  { key: "personalInfo", label: "Thông tin cá nhân", icon: "person-outline" },
  { key: "orders", label: "Lịch sử đơn hàng", icon: "receipt-outline" },
  {
    key: "rewards",
    label: "Ưu đãi thành viên",
    icon: "gift-outline",
    caption: "Đổi điểm tích lũy lấy voucher giảm giá",
  },
  {
    key: "policy",
    label: "Chính sách & Điều khoản",
    icon: "document-text-outline",
    caption: "Chính sách bảo mật và đổi trả sản phẩm",
  },
  { key: "support", label: "Trung tâm hỗ trợ", icon: "help-buoy-outline" },
] as const;

export default function ProfileScreen() {
  const { logout, user } = useAuth();

  if (!user) {
    return null;
  }

  const isGoldMember = user.points >= 1000;
  const initials = user.fullName.trim().charAt(0).toUpperCase();

  const handleMenuPress = (key: string) => {
    if (key === "personalInfo") {
      router.push("/customer/edit-profile");
      return;
    }

    if (key === "orders") {
      router.push("/customer/orders");
      return;
    }

    if (key === "rewards") {
      // router.push("/customer/rewards");
      return;
    }

    if (key === "policy") {
      // router.push("/customer/policy");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <Pressable accessibilityLabel="Notifications" style={styles.bellButton}>
          <Ionicons color="#252525" name="notifications-outline" size={22} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSummary}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons color="#ffffff" name="sparkles" size={12} />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>Chào bạn!</Text>
            <Text style={styles.fullName} numberOfLines={1}>
              {user.fullName}
            </Text>
            <View style={styles.membershipRow}>
              <View
                style={[
                  styles.membershipBadge,
                  isGoldMember
                    ? styles.membershipBadgeGold
                    : styles.membershipBadgeSilver,
                ]}
              >
                <Ionicons
                  color={isGoldMember ? "#92660f" : "#5c5e5b"}
                  name="trophy"
                  size={11}
                />
                <Text
                  style={[
                    styles.membershipText,
                    isGoldMember
                      ? styles.membershipTextGold
                      : styles.membershipTextSilver,
                  ]}
                >
                  {isGoldMember ? "Thành viên Vàng" : "Thành viên Bạc"}
                </Text>
              </View>
              <Text style={styles.points}>{user.points} điểm</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                if (action.label === "Yêu thích") {
                  router.push("/customer/wishlist");
                }
              }}
              style={styles.quickAction}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons color="#d9475c" name={action.icon} size={22} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuPress(item.key)}
              style={[
                styles.menuRow,
                index < menuItems.length - 1 && styles.menuRowDivider,
              ]}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons color="#3d3e3c" name={item.icon} size={19} />
              </View>
              <View style={styles.menuLabelWrap}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {"caption" in item ? (
                  <Text style={styles.menuCaption}>{item.caption}</Text>
                ) : null}
              </View>
              <Ionicons color="#b7b9b5" name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons color="#c33e53" name="log-out-outline" size={19} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    color: "#252525",
    fontSize: 19,
    fontWeight: "800",
  },
  bellButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderWidth: 1.5,
    borderColor: "#f8fafc",
    borderRadius: 4,
    backgroundColor: "#d9475c",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  profileSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#2d5a4b",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f8fafc",
    borderRadius: 12,
    backgroundColor: "#e2a83f",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  greeting: {
    color: "#9a9c98",
    fontSize: 13,
  },
  fullName: {
    marginTop: 2,
    color: "#252525",
    fontSize: 20,
    fontWeight: "800",
  },
  membershipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  membershipBadgeGold: {
    backgroundColor: "#fdf0d9",
  },
  membershipBadgeSilver: {
    backgroundColor: "#eceeec",
  },
  membershipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  membershipTextGold: {
    color: "#92660f",
  },
  membershipTextSilver: {
    color: "#5c5e5b",
  },
  points: {
    color: "#747673",
    fontSize: 12,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAction: {
    width: "23%",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    marginTop: 4,
    color: "#3d3e3c",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  menuCard: {
    borderRadius: 14,
    paddingHorizontal: 6,
    marginBottom: 24,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1ee",
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#f1f2f0",
  },
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    color: "#252525",
    fontSize: 15,
    fontWeight: "700",
  },
  menuCaption: {
    marginTop: 2,
    color: "#9a9c98",
    fontSize: 12,
  },
  logoutButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#f3c4cc",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  logoutText: {
    color: "#c33e53",
    fontSize: 15,
    fontWeight: "800",
  },
});
