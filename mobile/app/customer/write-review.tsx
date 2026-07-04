import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { createReview, updateReview } from "@/services/reviewService";

// ─── Star Rating Component ────────────────────────────────────────────────────

type StarRatingProps = {
  value: number;
  onChange: (rating: number) => void;
};

function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          hitSlop={8}
          onPress={() => onChange(star)}
          style={styles.starTouchable}
        >
          <Ionicons
            color={star <= value ? "#f5a623" : "#d8d9d5"}
            name={star <= value ? "star" : "star-outline"}
            size={40}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const STAR_LABELS = [
  "",
  "Tệ",
  "Không hài lòng",
  "Bình thường",
  "Hài lòng",
  "Xuất sắc",
];

export default function WriteReviewScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    orderId: string;
    reviewId?: string;
    mode?: string;
    initialRating?: string;
    initialComment?: string;
    initialImages?: string;
  }>();

  const {
    orderId,
    reviewId,
    mode,
    initialRating,
    initialComment,
    initialImages,
  } = params;

  const isEditMode = mode === "edit";

  // ── State ─────────────────────────────────────────────────────────────────

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  // Ảnh từ Cloudinary (edit mode) — chỉ hiển thị, không re-upload trừ khi user chọn mới
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // Ảnh mới chọn từ thiết bị (local URI)
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Đổ dữ liệu cũ khi edit mode ──────────────────────────────────────────

  useEffect(() => {
    if (isEditMode) {
      if (initialRating) setRating(Number(initialRating));
      if (initialComment) setComment(initialComment);
      if (initialImages) {
        try {
          const parsed = JSON.parse(initialImages);
          if (Array.isArray(parsed)) setExistingImages(parsed);
        } catch {
          // ignore parse error
        }
      }
    }
  }, [isEditMode, initialRating, initialComment, initialImages]);

  // ── Chọn ảnh mới từ thư viện ─────────────────────────────────────────────

  const totalImages = existingImages.length + selectedImages.length;

  const pickImage = async () => {
    if (totalImages >= 5) {
      Alert.alert("Giới hạn ảnh", "Bạn chỉ có thể thêm tối đa 5 hình ảnh.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Cần quyền truy cập",
        "Hãy cấp quyền truy cập thư viện ảnh trong Cài đặt để tiếp tục."
      );
      return;
    }

    const remaining = 5 - totalImages;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setSelectedImages((prev) => [...prev, ...uris].slice(0, 5 - existingImages.length));
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Gửi / Cập nhật đánh giá ───────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!token || !orderId) return;

    if (rating === 0) {
      Alert.alert("Thiếu số sao", "Vui lòng chọn số sao đánh giá.");
      return;
    }
    if (comment.trim().length < 5) {
      Alert.alert(
        "Thiếu nội dung",
        "Vui lòng viết ít nhất 5 ký tự nhận xét."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditMode && reviewId) {
        // ── Chế độ Sửa: PUT /api/reviews/:id ───────────────────────────────
        // Nếu user chọn ảnh mới → gửi ảnh mới (thay thế hoàn toàn)
        // Nếu không chọn ảnh mới → giữ danh sách existingImages (URL Cloudinary cũ)
        await updateReview(token, reviewId, {
          rating,
          comment: comment.trim(),
          images: selectedImages.length > 0 ? selectedImages : undefined,
          existingImages: selectedImages.length > 0 ? [] : existingImages,
        });
        Alert.alert("Đã cập nhật 🎉", "Đánh giá của bạn đã được cập nhật!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        // ── Chế độ Tạo mới: POST /api/reviews ──────────────────────────────
        await createReview(token, {
          orderId,
          rating,
          comment: comment.trim(),
          images: selectedImages,
        });
        Alert.alert("Thành công 🎉", "Cảm ơn bạn đã phản hồi!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Thao tác thất bại";
      Alert.alert("Lỗi", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons color="#252525" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Sửa đánh giá" : "Đánh giá đơn hàng"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Khối 1: Chọn số sao ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Mức độ hài lòng</Text>
            <StarRating onChange={setRating} value={rating} />
            {rating > 0 && (
              <Text style={styles.starLabel}>{STAR_LABELS[rating]}</Text>
            )}
          </View>

          {/* ── Khối 2: Nhập nhận xét ───────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Nhận xét của bạn</Text>
            <TextInput
              editable={!isSubmitting}
              maxLength={500}
              multiline
              numberOfLines={5}
              onChangeText={setComment}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm/dịch vụ..."
              placeholderTextColor="#adb0ab"
              style={styles.textInput}
              textAlignVertical="top"
              value={comment}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* ── Khối 3: Quản lý hình ảnh ─────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Hình ảnh{" "}
              <Text style={styles.optionalBadge}>
                (tùy chọn, tối đa 5 ảnh)
              </Text>
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
            >
              <View style={styles.imagesRow}>
                {/* Ảnh cũ từ Cloudinary (edit mode) */}
                {existingImages.map((uri, index) => (
                  <View key={`existing-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imageThumbnail} />
                    <View style={styles.existingBadge}>
                      <Ionicons color="#fff" name="cloud-done-outline" size={9} />
                    </View>
                    <Pressable
                      hitSlop={4}
                      onPress={() => removeExistingImage(index)}
                      style={styles.removeBtn}
                    >
                      <Ionicons color="#fff" name="close" size={12} />
                    </Pressable>
                  </View>
                ))}

                {/* Ảnh mới chọn từ thiết bị */}
                {selectedImages.map((uri, index) => (
                  <View key={`new-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imageThumbnail} />
                    <Pressable
                      hitSlop={4}
                      onPress={() => removeNewImage(index)}
                      style={styles.removeBtn}
                    >
                      <Ionicons color="#fff" name="close" size={12} />
                    </Pressable>
                  </View>
                ))}

                {/* Nút thêm ảnh */}
                {totalImages < 5 && (
                  <Pressable
                    disabled={isSubmitting}
                    onPress={pickImage}
                    style={styles.addImageBtn}
                  >
                    <Ionicons color="#2d5a4b" name="add" size={28} />
                    <Text style={styles.addImageText}>Thêm ảnh</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* Ghi chú khi edit và user không chọn ảnh mới */}
            {isEditMode && selectedImages.length === 0 && existingImages.length > 0 && (
              <Text style={styles.imageHint}>
                Đang dùng ảnh cũ. Chọn ảnh mới để thay thế toàn bộ.
              </Text>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Nút gửi / cập nhật ───────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  color="#fff"
                  name={isEditMode ? "checkmark-circle-outline" : "send"}
                  size={18}
                />
                <Text style={styles.submitBtnText}>
                  {isEditMode ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f6f3",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1ee",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f5f6f3",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#252525",
    fontSize: 16,
    fontWeight: "800",
  },
  headerRight: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#1e201d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    color: "#3a3c39",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
  },
  optionalBadge: {
    color: "#9a9c98",
    fontSize: 12,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  starTouchable: {
    padding: 4,
  },
  starLabel: {
    textAlign: "center",
    marginTop: 10,
    color: "#f5a623",
    fontSize: 14,
    fontWeight: "700",
  },
  textInput: {
    minHeight: 110,
    backgroundColor: "#f8f8f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e9e5",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: "#252525",
    fontSize: 14,
    lineHeight: 20,
  },
  charCount: {
    marginTop: 6,
    textAlign: "right",
    color: "#b0b2ae",
    fontSize: 11,
  },
  imagesScroll: {
    marginTop: 4,
  },
  imagesRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "visible",
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f0f1ee",
  },
  existingBadge: {
    position: "absolute",
    bottom: -4,
    left: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2d5a4b",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#c33e53",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2d5a4b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f7f4",
    gap: 2,
  },
  addImageText: {
    color: "#2d5a4b",
    fontSize: 10,
    fontWeight: "700",
  },
  imageHint: {
    marginTop: 8,
    color: "#8c8e8a",
    fontSize: 11,
    fontStyle: "italic",
  },
  bottomSpacer: {
    height: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f1ee",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2d5a4b",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
