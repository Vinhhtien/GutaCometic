require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("./config/db");
const Product = require("./models/Product");
const Review = require("./models/Review");
const Store = require("./models/Store");
const StoreInventory = require("./models/StoreInventory");

const products = [
  {
    sku: "CLEANSER-COSRX-001",
    name: "Low pH Good Morning Gel Cleanser",
    brand: "COSRX",
    description: "A gentle daily cleanser with a skin-friendly low pH.",
    image:
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
    ],
    price: 320000,
    originalPrice: 380000,
    category: "Cleanser",
    skinTypes: ["Oily", "Combination", "Sensitive"],
    ingredients: [
      {
        icon: "water-outline",
        title: "Cân bằng pH da",
        subtitle: "Tea Tree Oil",
      },
      {
        icon: "leaf-outline",
        title: "Làm sạch dịu nhẹ",
        subtitle: "Chiết xuất tự nhiên",
      },
    ],
  },
  {
    sku: "SERUM-ORDINARY-001",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    description: "A lightweight serum for visible shine and uneven texture.",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    ],
    price: 290000,
    originalPrice: 350000,
    category: "Serum",
    skinTypes: ["Oily", "Combination", "Acne-prone"],
    ingredients: [
      {
        icon: "water-outline",
        title: "Phục hồi chuyên sâu",
        subtitle: "Niacinamide 10%",
      },
      {
        icon: "shield-checkmark-outline",
        title: "Kiểm soát dầu nhờn",
        subtitle: "Zinc PCA 1%",
      },
    ],
  },
  {
    sku: "MOIST-CERAVE-001",
    name: "Moisturizing Cream",
    brand: "CeraVe",
    description: "A rich moisturizer with ceramides for the skin barrier.",
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
    ],
    price: 450000,
    originalPrice: null,
    category: "Moisturizer",
    skinTypes: ["Dry", "Normal", "Sensitive"],
    ingredients: [
      {
        icon: "water-outline",
        title: "Phục hồi hàng rào da",
        subtitle: "3 loại Ceramides",
      },
      {
        icon: "snow-outline",
        title: "Cấp ẩm chuyên sâu",
        subtitle: "Hyaluronic Acid",
      },
    ],
  },
  {
    sku: "SUNSCREEN-LRP-001",
    name: "Anthelios Invisible Fluid SPF 50+",
    brand: "La Roche-Posay",
    description: "Lightweight broad-spectrum daily sun protection.",
    image:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    ],
    price: 520000,
    originalPrice: 600000,
    category: "Sunscreen",
    skinTypes: ["All"],
    ingredients: [
      {
        icon: "sunny-outline",
        title: "Chống nắng phổ rộng",
        subtitle: "SPF 50+ PA++++",
      },
      {
        icon: "shield-checkmark-outline",
        title: "Kết cấu mỏng nhẹ",
        subtitle: "Không gây bóng nhờn",
      },
    ],
  },
];

const reviewsBySku = {
  "CLEANSER-COSRX-001": [
    {
      customerName: "Minh Trang",
      rating: 5,
      comment: "Sữa rửa mặt dịu nhẹ, da mình không còn bị khô căng sau khi rửa.",
    },
    {
      customerName: "Hoàng Nam",
      rating: 4,
      comment: "Mùi trà xanh thơm nhẹ, rửa sạch nhưng không làm mất ẩm da.",
    },
  ],
  "SERUM-ORDINARY-001": [
    {
      customerName: "Minh Trang",
      rating: 5,
      comment: "Serum thật sự tuyệt vời! Da mình đã cải thiện rõ rệt sau 2 tuần sử dụng.",
    },
    {
      customerName: "Hoàng Nam",
      rating: 5,
      comment: "Chất lượng sản phẩm rất tốt, thẩm thấu nhanh và không nhờn rít.",
    },
  ],
  "MOIST-CERAVE-001": [
    {
      customerName: "Thuỳ Linh",
      rating: 5,
      comment: "Kem dưỡng cấp ẩm cực tốt, da khô của mình mềm mịn hẳn ra.",
    },
    {
      customerName: "Quốc Bảo",
      rating: 4,
      comment: "Kết cấu hơi đặc nhưng thấm khá nhanh, không gây bí da.",
    },
  ],
  "SUNSCREEN-LRP-001": [
    {
      customerName: "Thuỳ Linh",
      rating: 5,
      comment: "Chống nắng nhẹ mặt, không để lại vết trắng, dùng cả ngày vẫn ok.",
    },
    {
      customerName: "Quốc Bảo",
      rating: 4,
      comment: "Thấm nhanh, không nhờn rít, hợp với da dầu của mình.",
    },
  ],
};

const store = {
  name: "GUTA Cosmetic - Quận 1",
  type: "CENTRAL",
  address: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  phone: "0281234567",
};

const seed = async () => {
  try {
    await connectDatabase();

    const savedProducts = [];

    for (const product of products) {
      const savedProduct = await Product.findOneAndUpdate(
        { sku: product.sku },
        { $set: product },
        { upsert: true, runValidators: true, new: true }
      );
      savedProducts.push(savedProduct);
    }

    console.log(`Seeded ${savedProducts.length} products`);

    const savedStore = await Store.findOneAndUpdate(
      { name: store.name },
      { $set: store },
      { upsert: true, runValidators: true, new: true }
    );

    console.log(`Seeded store: ${savedStore.name}`);

    for (const savedProduct of savedProducts) {
      await StoreInventory.findOneAndUpdate(
        { storeId: savedStore._id, productId: savedProduct._id },
        {
          $setOnInsert: {
            storeId: savedStore._id,
            productId: savedProduct._id,
            totalStock: 100,
            reservedStock: 0,
          },
        },
        { upsert: true, runValidators: true }
      );
    }

    console.log(`Seeded inventory for ${savedProducts.length} products at ${savedStore.name}`);

    let seededReviewCount = 0;

    for (const savedProduct of savedProducts) {
      const existingReviewCount = await Review.countDocuments({
        productId: savedProduct._id,
      });

      if (existingReviewCount > 0) {
        continue;
      }

      const reviewsForProduct = reviewsBySku[savedProduct.sku] || [];

      if (reviewsForProduct.length === 0) {
        continue;
      }

      await Review.insertMany(
        reviewsForProduct.map((review) => ({
          ...review,
          productId: savedProduct._id,
        }))
      );
      seededReviewCount += reviewsForProduct.length;
    }

    console.log(`Seeded ${seededReviewCount} reviews`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
