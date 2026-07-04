import { API_BASE_URL } from "@/services/api";
import { apiRequest } from "@/services/api";
import { Review } from "@/types/review";

// ─── Lấy danh sách đánh giá theo sản phẩm ────────────────────────────────────

export const getProductReviews = async (
  token: string,
  productId: string,
  limit?: number
) => {
  const params = new URLSearchParams({ productId });

  if (limit) {
    params.set("limit", String(limit));
  }

  const response = await apiRequest<{ reviews: Review[] }>(
    `/reviews?${params.toString()}`,
    { token }
  );

  return response.reviews;
};

// ─── Lấy đánh giá theo đơn hàng ──────────────────────────────────────────────

export const getReviewByOrder = async (token: string, orderId: string) => {
  const response = await apiRequest<{ review: Review | null }>(
    `/reviews/order/${orderId}`,
    { token }
  );
  return response.review;
};

// ─── Tạo đánh giá mới (multipart/form-data + ảnh) ────────────────────────────

export const createReview = async (
  token: string,
  data: {
    orderId: string;
    rating: number;
    comment: string;
    images: string[]; // local URIs
  }
) => {
  const formData = new FormData();

  formData.append("orderId", data.orderId);
  formData.append("rating", String(data.rating));
  formData.append("comment", data.comment);

  // Đóng gói từng ảnh dưới dạng file object
  data.images.forEach((uri, index) => {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";

    formData.append("images", {
      uri,
      name: `review_photo_${index + 1}.${ext}`,
      type: mimeType,
    } as unknown as Blob);
  });

  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Không set Content-Type thủ công → React Native tự thêm boundary cho multipart
    },
    body: formData,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((json as { message?: string }).message || "Gửi đánh giá thất bại");
  }

  return (json as { review: Review }).review;
};

// ─── Cập nhật đánh giá ────────────────────────────────────────────────────────

export const updateReview = async (
  token: string,
  reviewId: string,
  data: {
    rating?: number;
    comment?: string;
    images?: string[];        // local URIs — ảnh mới upload
    existingImages?: string[]; // URL Cloudinary — ảnh cũ giữ lại
  }
) => {
  const formData = new FormData();

  if (data.rating !== undefined) formData.append("rating", String(data.rating));
  if (data.comment !== undefined) formData.append("comment", data.comment);

  // Gửi danh sách ảnh cũ (URL Cloudinary) dưới dạng JSON string
  if (data.existingImages !== undefined) {
    formData.append("existingImages", JSON.stringify(data.existingImages));
  }

  // Gửi ảnh mới từ thiết bị (nếu có)
  if (data.images && data.images.length > 0) {
    data.images.forEach((uri, index) => {
      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";

      formData.append("images", {
        uri,
        name: `review_photo_${index + 1}.${ext}`,
        type: mimeType,
      } as unknown as Blob);
    });
  }

  const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((json as { message?: string }).message || "Cập nhật thất bại");
  }

  return (json as { review: Review }).review;
};

// ─── Xóa đánh giá ────────────────────────────────────────────────────────────

export const deleteReview = async (token: string, reviewId: string) => {
  return apiRequest<{ message: string }>(`/reviews/${reviewId}`, {
    token,
    method: "DELETE",
  });
};
