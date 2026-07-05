import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_OPTIONS = [
  "La Roche-Posay",
  "Vichy",
  "GUTA Test",
  "Bioderma",
  "CeraVe",
  "Neutrogena",
];

const SKIN_TYPE_OPTIONS = [
  "Da dầu",
  "Da khô",
  "Da nhạy cảm",
  "Da mụn",
  "Da lão hóa",
  "Da thường",
];

// ─────────────────────────────────────────────────────────────────────────────
// FilterScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function FilterScreen() {
  const insets = useSafeAreaInsets();

  // Receive current filter values passed from CategoryScreen
  const params = useLocalSearchParams<{
    minPrice?: string;
    maxPrice?: string;
    selectedBrand?: string;
    selectedSkinType?: string;
  }>();

  const [minPrice, setMinPrice] = useState(params.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? "");
  const [selectedBrand, setSelectedBrand] = useState(
    params.selectedBrand ?? ""
  );
  const [selectedSkinType, setSelectedSkinType] = useState(
    params.selectedSkinType ?? ""
  );

  // ── Reset all fields ──
  const handleReset = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedBrand("");
    setSelectedSkinType("");
  };

  // ── Apply: push filter values back as search params, then go back ──
  const handleApply = () => {
    // Navigate back to the previous screen and pass the new filter as params.
    // router.back() does NOT support passing params, so we replace the tab
    // route with the updated filter values instead — category.tsx reads them
    // via useLocalSearchParams just like it already does for `search` & `selectedCategory`.
    router.navigate({
      pathname: "/customer/(tabs)/category",
      params: {
        filterMinPrice: minPrice,
        filterMaxPrice: maxPrice,
        filterBrand: selectedBrand,
        filterSkinType: selectedSkinType,
        filterTs: Date.now().toString(), // force re-read even if same values
      },
    });
  };

  // ── Close without applying (swipe back or press back arrow) ──
  const handleClose = () => {
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : 20 },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Đóng bộ lọc"
          hitSlop={10}
          onPress={handleClose}
          style={styles.closeBtn}
        >
          <Ionicons color="#252525" name="arrow-back" size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Bộ lọc tìm kiếm</Text>
        {/* Spacer to keep title visually centered */}
        <View style={styles.closeBtn} />
      </View>

      {/* ── Scrollable content ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section: Khoảng giá ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Khoảng giá</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceLabel}>Tối thiểu (đ)</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={setMinPrice}
                  placeholder="0"
                  placeholderTextColor="#b0b2ae"
                  style={styles.priceInput}
                  value={minPrice}
                />
              </View>

              <View style={styles.priceSeparator}>
                <View style={styles.priceLine} />
              </View>

              <View style={styles.priceInputWrap}>
                <Text style={styles.priceLabel}>Tối đa (đ)</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={setMaxPrice}
                  placeholder="∞"
                  placeholderTextColor="#b0b2ae"
                  style={styles.priceInput}
                  value={maxPrice}
                />
              </View>
            </View>
          </View>

          {/* ── Section: Thương hiệu ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Thương hiệu</Text>
            <View style={styles.chipGrid}>
              {BRAND_OPTIONS.map((brand) => {
                const isActive = selectedBrand === brand;
                return (
                  <Pressable
                    key={brand}
                    onPress={() => setSelectedBrand(isActive ? "" : brand)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {brand}
                    </Text>
                    {isActive && (
                      <Ionicons
                        color="#ffffff"
                        name="checkmark"
                        size={12}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Section: Loại da ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Loại da</Text>
            <View style={styles.chipGrid}>
              {SKIN_TYPE_OPTIONS.map((st) => {
                const isActive = selectedSkinType === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => setSelectedSkinType(isActive ? "" : st)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                    {isActive && (
                      <Ionicons
                        color="#ffffff"
                        name="checkmark"
                        size={12}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom action bar ── */}
      <View
        style={[
          styles.bottomActions,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleReset}
          style={styles.resetBtn}
        >
          <Ionicons color="#252525" name="refresh-outline" size={16} />
          <Text style={styles.resetBtnText}>Thiết lập lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleApply}
          style={styles.applyBtn}
        >
          <Ionicons color="#ffffff" name="checkmark-done" size={16} />
          <Text style={styles.applyBtnText}>Áp dụng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Full-screen wrapper ──
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // ── Top header bar ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1ee",
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1b19",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f4f5f2",
  },

  // ── Scrollable content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1b19",
    marginBottom: 12,
    letterSpacing: -0.1,
  },

  // ── Price inputs ──
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
    gap: 6,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888a86",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#e1e2df",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#252525",
    backgroundColor: "#fafafa",
  },
  priceSeparator: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  priceLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#d9dad6",
  },

  // ── Chip grid ──
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e1e2df",
    backgroundColor: "#fafafa",
  },
  chipActive: {
    borderColor: "#252525",
    backgroundColor: "#252525",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555755",
  },
  chipTextActive: {
    color: "#ffffff",
  },

  // ── Bottom action bar ──
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20, // fallback; real value injected inline via insets.bottom
    borderTopWidth: 1,
    borderTopColor: "#f0f1ee",
    backgroundColor: "#ffffff",
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d9dad6",
    backgroundColor: "#f6f7f5",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#252525",
  },
  applyBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#252525",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
