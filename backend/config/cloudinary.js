const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ─── Kết nối Cloudinary bằng biến môi trường ──────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Cấu hình CloudinaryStorage ───────────────────────────────────────────────
const reviewStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "guta_cosmetic/reviews",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  },
});

// ─── Middleware upload – tối đa 5 ảnh, mỗi ảnh ≤ 5 MB ────────────────────────
const upload = multer({
  storage: reviewStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép định dạng JPG, JPEG hoặc PNG"), false);
    }
  },
});

module.exports = { cloudinary, upload };
