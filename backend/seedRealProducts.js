require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("./config/db");
const Product = require("./models/Product");
const Store = require("./models/Store");
const StoreInventory = require("./models/StoreInventory");

const DEFAULT_STOCK_PER_STORE = 100;

const products = [
  {
    sku: "SUN-LRP-001",
    name: "Kem Chống Nắng La Roche-Posay Phổ Rộng, Nâng Tông Kiềm Dầu 50ml",
    brand: "La Roche-Posay",
    description: "Anthelios XL SPF 50+ PA++++. Bảo vệ da tối ưu, kiềm dầu và nâng tông nhẹ nhàng.",
    image: "https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90):format(webp)/lrp_anthelios_uvmune_400_oil_gel_cream_ap_bottle_packshot_front_f43835fdee.png",
    price: 413000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da nhạy cảm"],
    volume: "50ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "sunny-outline",
        title: "Màng lọc độc quyền XL-PROTECT",
        subtitle: "Chống nắng phổ rộng bảo vệ da tối ưu trước tia UVA/UVB, ô nhiễm và tia hồng ngoại"
      },
      {
        icon: "shield-checkmark-outline",
        title: "Hoạt chất Airlicium",
        subtitle: "Chứa các vi hạt siêu nhỏ giúp hấp thụ bã nhờn gấp 150 lần, kiểm soát dầu thừa hiệu quả"
      },
      {
        icon: "water-outline",
        title: "Nước khoáng La Roche-Posay",
        subtitle: "Làm dịu da, giảm kích ứng và chống oxy hóa mạnh mẽ cho da nhạy cảm"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-ANE-002",
    name: "Sữa Chống Nắng Anessa Dưỡng Da Kiềm Dầu 60ml (Bản Mới)",
    brand: "Anessa",
    description: "Perfect UV Sunscreen Skincare Milk N SPF50+ PA++++. Công nghệ chống chống nắng phổ rộng vượt trội.",
    image: "https://bizweb.dktcdn.net/thumb/1024x1024/100/257/549/products/4909978147105-1.jpg?v=1747901333957",
    price: 432000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu"],
    volume: "60ml",
    origin: "Nhật Bản",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "flash-outline",
        title: "Công nghệ Auto Booster",
        subtitle: "Lớp màng bảo vệ trở nên mạnh mẽ hơn khi tiếp xúc với Nhiệt độ - Độ ẩm - Nước - Mồ hôi"
      },
      {
        icon: "leaf-outline",
        title: "50% Thành phần dưỡng da",
        subtitle: "Chiết xuất Trà Xanh, Hoa Vàng, Collagen và HA giúp chống lão hóa, dưỡng ẩm sâu"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-ANE-003",
    name: "Sữa Chống Nắng Anessa Cho Da Nhạy Cảm & Trẻ Em 60ml",
    brand: "Anessa",
    description: "Perfect UV Sunscreen Mild Milk SPF50+/PA++++. Dịu nhẹ, an toàn tuyệt đối cho làn da mỏng manh.",
    image: "https://bizweb.dktcdn.net/100/527/574/products/4909978131586-1-1729220728627.jpg?v=1729220735810",
    price: 432000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm"],
    volume: "60ml",
    origin: "Nhật Bản",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "shield-outline",
        title: "Công nghệ Smooth Protect",
        subtitle: "Dàn đều các phân tử chống nắng, phản xạ tia UV tối đa mà vẫn mỏng nhẹ, không gây vón"
      },
      {
        icon: "heart-outline",
        title: "Công thức 5 Không an toàn",
        subtitle: "Không màu, không mùi, không cồn, không dầu khoáng và không paraben, dùng được cho trẻ em"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-SK1-004",
    name: "Kem Chống Nắng Skin1004 Cho Da Nhạy Cảm SPF 50+ 50ml",
    brand: "Skin1004",
    description: "Madagascar Centella Air-Fit Suncream Plus SPF50+ PA++++. Chiết xuất rau má làm dịu da.",
    image: "https://product.hstatic.net/1000006063/product/634_cce7ac3a340e47f5986eab4bbd6afb09_1024x1024.jpg",
    price: 242000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm", "Da mụn"],
    volume: "50ml",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "Chiết xuất Rau má Madagascar",
        subtitle: "Giàu chất chống oxy hóa, làm dịu vùng da mụn, kháng viêm và phục hồi da tổn thương"
      },
      {
        icon: "color-wand-outline",
        title: "Nâng tông nhẹ nhàng",
        subtitle: "Kết cấu kem màu satin mỏng nhẹ giúp hiệu chỉnh sắc tố da, làm đều màu da tự nhiên"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-LOR-005",
    name: "Kem Chống Nắng L'Oreal X20 Thoáng Da Mỏng Nhẹ 50ml",
    brand: "L'Oreal",
    description: "UV Defender Invisible Resist Daily Sunscreen SPF50+ PA++++. Kết cấu mỏng nhẹ mờ sương không bết dính.",
    image: "https://production-cdn.pharmacity.io/digital/828x828/plain/e-com/images/product/20250609082640-0-P26136_1.jpg?versionId=3dCLYUvmRcRLgOOnvESnSjmTsdueZaMA",
    price: 261000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da dầu"],
    volume: "50ml",
    origin: "Indonesia",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "layers-outline",
        title: "Màng lọc thế giới mới Mexoryl 400",
        subtitle: "Bảo vệ da vượt trội khỏi các tia UV dài độc hại, ngăn ngừa thâm sạm và lão hóa sớm"
      },
      {
        icon: "happy-outline",
        title: "Kết cấu Invisible Fluid",
        subtitle: "Mỏng nhẹ hơn gấp 20 lần so với kem chống nắng thông thường, không vệt trắng, thoáng mịn"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-MAR-006",
    name: "Kem Chống Nắng MartiDerm Phổ Rộng Bảo Vệ Toàn Diện 40ml",
    brand: "Martiderm",
    description: "The Originals Proteos Screen SPF50+ Fluid Cream. Chống nắng phổ rộng ngăn ngừa lão hóa.",
    image: "https://chuoinhathuocminhchau.com/wp-content/uploads/2025/02/kem-chong-nang-pho-rong-bao-ve-martiderm.png",
    price: 579000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da dầu", "Da hỗn hợp"],
    volume: "40ml",
    origin: "Tây Ban Nha",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "globe-outline",
        title: "Phổ rộng toàn diện Encapsulated Sunscreens",
        subtitle: "Chống tia UVA, UVB, tia hồng ngoại (IR) và cả ánh sáng xanh (HEV) từ màn hình thiết bị"
      },
      {
        icon: "sparkles-outline",
        title: "Phức hợp Proteoglycans & HA",
        subtitle: "Cấp ẩm chuyên sâu, kích thích tái tạo tế bào, cải thiện độ đàn hồi và ngăn ngừa chảy xệ"
      }
    ],
    isActive: true,
  },
  {
    sku: "SUN-DAL-007",
    name: "Kem Chống Nắng d'Alba Nâng Tông Tím Hiệu Chỉnh Sắc Da 50ml",
    brand: "d'Alba",
    description: "Waterfull Tone-Up Purple Correcting Sun Cream SPF50+ PA++++. Chiết xuất nấm Truffle trắng giúp da căng bóng.",
    image: "https://medias.watsons.vn/publishing/WTCVN-216982-side-zoom.jpg?version=1772118291",
    price: 397000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da xỉn màu"],
    volume: "50ml",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "color-palette-outline",
        title: "Sắc tím hiệu chỉnh da vàng xỉn",
        subtitle: "Trung hòa sắc tố vàng đặc trưng của làn da châu Á, nâng tông rạng rỡ và trong trẻo"
      },
      {
        icon: "star-outline",
        title: "Nấm Truffle Trắng Ý & Tocopherol",
        subtitle: "Thành phần độc quyền Trufferol giúp chống oxy hóa mạnh mẽ, nuôi dưỡng làn da căng bóng"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-BIO-008",
    name: "Nước Tẩy Trang Bioderma Dành Cho Da Nhạy Cảm 500ml",
    brand: "Bioderma",
    description: "Sensibio H2O. Tẩy trang công nghệ Micellar dịu nhẹ, không cần rửa lại với nước.",
    image: "https://bizweb.dktcdn.net/100/482/555/products/them-tieu-de-19-e7ed8220-9f0c-4edd-8871-1e1ad1a05702.png?v=1689412319343",
    price: 361000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm"],
    volume: "500ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "water-outline",
        title: "Công nghệ hạt Micellar thông minh",
        subtitle: "Hút sạch bụi mịn, dầu thừa và lớp trang điểm mà không làm tổn hại đến lớp màng lipid da"
      },
      {
        icon: "flower-outline",
        title: "Chiết xuất dưa leo & Đường sinh học",
        subtitle: "Làm dịu da tức thì, cân bằng sinh học giúp duy trì độ ẩm lý tưởng sau khi làm sạch"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-BIO-009",
    name: "Nước Tẩy Trang Bioderma Dành Cho Da Dầu & Hỗn Hợp 500ml",
    brand: "Bioderma",
    description: "Sébium H2O. Kiểm soát bã nhờn, làm sạch sâu và ngăn ngừa bít tắc lỗ chân lông.",
    image: "https://bizweb.dktcdn.net/thumb/grande/100/194/749/products/7ce6fc63-4aa5-46ac-b53e-65d2c5eb5346.jpg?v=1747814976503",
    price: 369000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da mụn"],
    volume: "500ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "options-outline",
        title: "Phức hợp sửa đổi bã nhờn Fluidactiv",
        subtitle: "Kiểm soát và điều hòa chất lượng sợi bã nhờn, hạn chế tối đa nguy cơ hình thành mụn ẩn"
      },
      {
        icon: "shield-checkmark-outline",
        title: "Kẽm Gluconate & Đồng Sulfate",
        subtitle: "Kháng khuẩn, làm sạch sâu lỗ chân lông, tạo màu xanh tự nhiên và mang lại cảm giác thông thoáng"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-LOR-010",
    name: "Nước Tẩy Trang L'Oreal Tươi Mát Cho Da Dầu, Hỗn Hợp 400ml",
    brand: "L'Oreal",
    description: "Micellar Water 3-in-1 Refreshing. Giúp làm sạch sâu mang lại cảm giác tươi mát tức thì.",
    image: "https://media.shoptretho.com.vn/upload/20230328/nuoc-tay-trang-tuoi-mat-l-oreal-3-in-1-danh-cho-da-dau-da-hon-hop-400ml-1.jpg",
    price: 149000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da hỗn hợp"],
    volume: "400ml",
    origin: "Indonesia",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "refresh-outline",
        title: "Nước khoáng từ ngọn núi Pháp",
        subtitle: "Mang lại cảm giác tươi mát, sảng khoái tức thì và làm bừng sáng làn da xỉn màu"
      },
      {
        icon: "water-outline",
        title: "Hạt Micellar siêu nhỏ",
        subtitle: "Hoạt động như nam châm từ tính giúp loại bỏ lớp trang điểm, kem chống nắng và bụi mịn PM2.5"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-LOR-011",
    name: "Nước Tẩy Trang L'Oreal Làm Sạch Sâu Trang Điểm 400ml",
    brand: "L'Oreal",
    description: "Micellar Water 3-in-1 Deep Cleansing. Lớp dầu và nước giúp hòa tan mọi lớp makeup chống nước.",
    image: "https://cdn.nhathuoclongchau.com.vn/v1/static/00502179_loreal_micellar_water_refreshing_400ml_nuoc_tay_trang_danh_cho_da_hon_hop_va_da_dau_2651_63db_large_f1207fa49a.jpg",
    price: 148000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da nhạy cảm"],
    volume: "400ml",
    origin: "Indonesia",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "git-compare-outline",
        title: "Kết cấu 2 lớp Bi-Phase Bi đột phá",
        subtitle: "Lớp dầu làm sạch sâu các sản phẩm chống nước (Waterproof) hòa quyện cùng lớp nước nhẹ dịu"
      },
      {
        icon: "heart-outline",
        title: "Công thức không chứa cồn & hương liệu",
        subtitle: "Đảm bảo an toàn tuyệt đối cho vùng da mắt mỏng manh và môi mà không gây khô rát"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-GAR-012",
    name: "Nước Tẩy Trang Garnier Dành Cho Da Dầu Và Mụn 400ml",
    brand: "Garnier",
    description: "Micellar Cleansing Water For Oily & Acne-Prone Skin. Kháng khuẩn và làm dịu nốt mụn.",
    image: "https://media.hcdn.vn/catalog/product/g/o/google-shopping-nuoc-tay-trang-garnier-danh-cho-da-dau-va-mun-400ml-moi-1676003407_img_450x450_31d6f9_fit_center.jpg",
    price: 121000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da mụn"],
    volume: "400ml",
    origin: "Indonesia",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "shield-outline",
        title: "Hạt Micelles & Công nghệ làm sạch sâu",
        subtitle: "Lấy đi dầu thừa bám sâu dưới biểu bì da mà không cần chà xát mạnh gây tổn thương mụn"
      },
      {
        icon: "medical-outline",
        title: "Công thức giảm dầu nhờn giảm khuẩn",
        subtitle: "Thiết kế tối ưu cho da mụn, hỗ trợ gom cồi mụn nhanh và ngăn ngừa mụn mới phát triển"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-COC-013",
    name: "Combo 2 Nước Tẩy Trang Bí Đao Cocoon Làm Sạch & Giảm Dầu 500ml",
    brand: "Cocoon",
    description: "Winter Melon Micellar Water. Thành phần thuần chay từ bí đao, rau má và tràm trà.",
    image: "https://myphamthuanchay.com/images/product/combo-2-nuoc-tay-trang-bi-dao-cocoon-500ml-giup-tay-sach-makeup-giam-dau.jpg",
    price: 281000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da mụn"],
    volume: "500ml x 2",
    origin: "Việt Nam",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "Chiết xuất Bí đao thanh mát",
        subtitle: "Kháng viêm, làm mát và làm dịu tình trạng mụn sưng viêm, điều tiết lượng dầu tiết ra"
      },
      {
        icon: "flask-outline",
        title: "Tinh dầu Tràm trà & O-Cymen-5-Ol",
        subtitle: "Tăng cường khả năng kháng khuẩn, hỗ trợ trị mụn trứng cá và bảo vệ da toàn diện"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-LRP-014",
    name: "Nước Tẩy Trang La Roche-Posay Dành Cho Da Nhạy Cảm 400ml",
    brand: "La Roche-Posay",
    description: "Micellar Water Ultra Sensitive Skin. Giảm thiểu ma sát tối đa, bảo vệ hàng rào da.",
    image: "https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90):format(webp)/z6733833409817_6768def963cc2fa621eab70b85ff66f0_e19b6bf883.jpg",
    price: 388000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm"],
    volume: "400ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "water-outline",
        title: "Hạt Micellar Ultra cải tiến",
        subtitle: "Làm sạch đến 99% lớp trang điểm và bụi bẩn bám dính mà vẫn êm dịu, không gây khô căng"
      },
      {
        icon: "sparkles-outline",
        title: "Glycerin cấp ẩm tối ưu",
        subtitle: "Duy trì độ ẩm tự nhiên, giảm ma sát tối đa của bông tẩy trang tác động lên bề mặt da"
      }
    ],
    isActive: true,
  },
  {
    sku: "REM-LRP-015",
    name: "Nước Tẩy Trang La Roche-Posay Cho Da Dầu, Nhạy Cảm 400ml",
    brand: "La Roche-Posay",
    description: "Effaclar Micellar Water Ultra Oily Skin. Làm sạch bóng dầu thừa mà không gây khô căng.",
    image: "https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90):format(webp)/00018487_lrc_posay_effeclar_micellar_water_ultra_400ml_m2862404_nuoc_lam_sach_sau_va_tay_trang_danh_cho_da_2538_614e_large_da8257209c.jpg",
    price: 419000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da mụn"],
    volume: "400ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "hardware-chip-outline",
        title: "Hợp chất Zinc PCA (Kẽm)",
        subtitle: "Hỗ trợ kiềm dầu, điều tiết lượng bã nhờn dư thừa và thanh lọc lỗ chân lông hiệu quả"
      },
      {
        icon: "shield-checkmark-outline",
        title: "Nước khoáng trị liệu thermal spring water",
        subtitle: "Chống oxy hóa, bảo vệ làn da dầu mụn nhạy cảm khỏi các kích ứng môi trường bên ngoài"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-CER-016",
    name: "Sữa Rửa Mặt CeraVe Sạch Sâu Cho Da Thường Đến Da Dầu 473ml",
    brand: "CeraVe",
    description: "Foaming Cleanser. Bổ sung Ceramide và Niacinamide giúp bảo vệ màng ẩm của da.",
    image: "https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_00420_9eca1db0a1.jpg",
    price: 369000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da dầu"],
    volume: "473ml",
    origin: "Mỹ",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "shield-outline",
        title: "3 loại Ceramides thiết yếu (1, 3, 6-II)",
        subtitle: "Khôi phục và duy trì hàng rào bảo vệ tự nhiên vững chắc của da"
      },
      {
        icon: "trending-up-outline",
        title: "Niacinamide (Vitamin B3)",
        subtitle: "Làm dịu da, hỗ trợ điều tiết bã nhờn, thu nhỏ lỗ chân lông và làm sáng đều màu da"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-CER-017",
    name: "Sữa Rửa Mặt CeraVe Sạch Sâu Cho Da Thường Đến Da Dầu 236ml",
    brand: "CeraVe",
    description: "Foaming Cleanser dung tích vừa phải tiện lợi mang đi du lịch.",
    image: "https://cdn.nhathuoclongchau.com.vn/v1/static/00502231_sua_rua_mat_lam_sach_sau_danh_cho_da_thuong_va_da_kho_cerave_hydrating_cleanser_mb094520_236ml_3680_6346_large_3e97372089.jpg",
    price: 272000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da dầu"],
    volume: "236ml",
    origin: "Mỹ",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "shield-outline",
        title: "Phức hợp Ceramide sinh học",
        subtitle: "Cấp khóa ẩm tầng sâu, bảo vệ cấu trúc màng da không bị phá vỡ sau khi tạo bọt rửa mặt"
      },
      {
        icon: "water-outline",
        title: "Hyaluronic Acid (HA)",
        subtitle: "Giữ nước vượt trội giúp bề mặt da luôn trong trạng thái ngậm nước, mịn màng"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-CER-018",
    name: "Sữa Rửa Mặt CeraVe Cho Da Thường Đến Khô 473ml",
    brand: "CeraVe",
    description: "Hydrating Cleanser. Dạng gel lotion không tạo bọt, cấp ẩm chuyên sâu.",
    image: "https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90):format(webp)/DSC_03706_e959da7394.jpg",
    price: 368000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da khô", "Da hỗn hợp khô"],
    volume: "473ml",
    origin: "Mỹ",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "sync-outline",
        title: "Công nghệ màng khóa ẩm MVE",
        subtitle: "Định lượng giải phóng liên tục các dưỡng chất giúp khóa ẩm suốt 24 giờ liên tục"
      },
      {
        icon: "thermometer-outline",
        title: "Kết cấu Gel Lotion không bọt",
        subtitle: "Làm sạch bụi bẩn siêu nhẹ nhàng mà hoàn toàn không lấy đi độ ẩm tự nhiên của da khô"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-LRP-019",
    name: "Gel Rửa Mặt La Roche-Posay Dành Cho Da Dầu, Nhạy Cảm 400ml",
    brand: "La Roche-Posay",
    description: "Effaclar Purifying Foaming Gel. Giúp làm sạch bụi bẩn và kiểm soát dầu hiệu quả.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSocglFSveS0keHFrOmXzfM9orcOX1Eb60Vz8zNpvhMB4XmHewqpYhzfCI&s=10",
    price: 425000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da nhạy cảm"],
    volume: "400ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "color-filter-outline",
        title: "Kẽm PCA kiểm soát bã nhờn",
        subtitle: "Thanh lọc làn da, loại bỏ dầu thừa tận sâu trong lỗ chân lông, ngăn chặn ổ mụn"
      },
      {
        icon: "medkit-outline",
        title: "Độ pH chuẩn lâm sàng 5.5",
        subtitle: "An toàn tuyệt đối cho màng sinh học bảo vệ da, không làm khô hay căng rát sau khi rửa"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-CET-021",
    name: "Sữa Rửa Mặt Cetaphil Dịu Lành Cho Da Nhạy Cảm 125ml",
    brand: "Cetaphil",
    description: "Gentle Skin Cleanser. Công thức khoa học mới giúp làm sạch dịu lành và an toàn.",
    image: "https://cdn.vuahanghieu.com/unsafe/0x0/left/top/smart/filters:quality(90)/https://admin.vuahanghieu.com/upload/news/content/2026/04/sua-rua-mat-diu-lanh-cho-da-nhay-cam-cetaphil-gentle-skin-cleanser-125ml-jpg-1776070842-13042026160042.jpg",
    price: 132000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm", "Da khô"],
    volume: "125ml",
    origin: "Canada",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "ribbon-outline",
        title: "Công thức cải tiến chuyên sâu",
        subtitle: "Sự kết hợp lý tưởng giữa Niacinamide, Panthenol (B5) và Glycerin bảo vệ màng ẩm da nhạy cảm"
      },
      {
        icon: "ban-outline",
        title: "Hoàn toàn xà phòng xà phòng",
        subtitle: "Không bọt, nhẹ nhàng lấy đi tạp chất, có thể dùng để rửa khô không cần nước tiện lợi"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLE-SVR-022",
    name: "Gel Rửa Mặt SVR Không Chứa Xà Phòng Cho Da Dầu 400ml",
    brand: "SVR",
    description: "Sebiaclear Gel Moussant. Chứa Gluconolactone làm sạch sâu lỗ chân lông, giảm mụn.",
    image: "https://img.watsonsvn.com/ecommerce/ecom/SVR/SVR-Sebiaclear-Gel-Moussant-400ml-2.jpg",
    price: 402000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu", "Da mụn"],
    volume: "400ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "construct-outline",
        title: "Hoạt chất Gluconolactone (PHA)",
        subtitle: "Làm sạch tế bào chết dịu nhẹ, kháng viêm và đẩy nhanh quá trình trị mụn ẩn, mụn đầu đen"
      },
      {
        icon: "cube-outline",
        title: "Mat SR 2% điều tiết dầu",
        subtitle: "Giúp điều hòa lượng tuyến bã nhờn hoạt động quá mức, đem lại làn da khô thoáng suốt ngày dài"
      }
    ],
    isActive: true,
  },
  {
    sku: "SER-KLA-023",
    name: "Nước Hoa Hồng Klairs Không Mùi Cho Da Nhạy Cảm 180ml",
    brand: "Klairs",
    description: "Supple Preparation Unscented Toner. Cân bằng độ pH, cấp ẩm dịu nhẹ tức thì.",
    image: "https://product.hstatic.net/1000006063/product/ded0e91db0af0dccf07e228ee5820454_a1e504912a63409997768c8767f25e75_1024x1024.jpeg",
    price: 218000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da nhạy cảm"],
    volume: "180ml",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "water-outline",
        title: "Sodium Hyaluronate & Phức hợp Axit Amin",
        subtitle: "Cấp nước dồi dào, làm mềm cấu trúc sừng, tạo tiền đề hấp thụ tốt các bước dưỡng sau"
      },
      {
        icon: "eye-off-outline",
        title: "Phiên bản Unscented không mùi",
        subtitle: "Loại bỏ hoàn toàn tinh dầu tạo mùi hương, an tâm tuyệt đối không lo kích ứng"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-LRP-024",
    name: "Kem Dưỡng La Roche-Posay Giúp Phục Hồi Da Đa Công Dụng 40ml",
    brand: "La Roche-Posay",
    description: "Cicaplast Baume B5+ Ultra-Repairing. Phục hồi da sau kích ứng, tổn thương, nặn mụn.",
    image: "https://cdn.hstatic.net/products/1000006063/bt_40ml_e0f9e63628b841caa385ae194884c13c_1024x1024.jpg",
    price: 335000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da nhạy cảm", "Da khô"],
    volume: "40ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "medkit-outline",
        title: "Panthenol 5% (Vitamin B5)",
        subtitle: "Nồng độ lý tưởng giúp làm dịu tức thì các vết đỏ, sưng tấy do kích ứng kem hay sau nặn mụn"
      },
      {
        icon: "git-merge-outline",
        title: "B5+ Kháng khuẩn & Hợp chất Tribioma",
        subtitle: "Phức hợp prebiotics độc quyền giúp cân bằng hệ vi sinh vật trên da, tăng tốc độ tái tạo biểu bì"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-LRP-025",
    name: "Kem Dưỡng La Roche-Posay Giúp Phục Hồi Da Đa Công Dụng 100ml",
    brand: "La Roche-Posay",
    description: "Cicaplast Baume B5+ dung tích lớn siêu tiết kiệm cho gia đình.",
    image: "https://product.hstatic.net/200000775601/product/screen_shot_2023-11-21_at_17.25.39_f2f48f8023f74601a3d7e04a2052d325.png",
    price: 636000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da nhạy cảm", "Da khô"],
    volume: "100ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "bandage-outline",
        title: "Madecassoside chiết xuất rau má",
        subtitle: "Thúc đẩy quá trình tăng sinh collagen, làm lành mô sẹo tổn thương nhanh chóng"
      },
      {
        icon: "shield-outline",
        title: "Bơ hạt mỡ & Zinc Gluconate",
        subtitle: "Tạo màng bảo vệ ngăn ngừa sự tấn công của vi khuẩn bên ngoài, nuôi dưỡng ẩm sâu"
      }
    ],
    isActive: true,
  },
  {
    sku: "SER-DAL-026",
    name: "Serum d'Alba Dạng Xịt Nấm Truffle Trắng Căng Bóng Da 100ml",
    brand: "d'Alba",
    description: "First Spray Serum. Cấp ẩm tầng sâu, tạo hiệu ứng mọng nước chuẩn Hàn.",
    image: "https://dalba.com/cdn/shop/files/100ml_18802f44-6c65-4476-af0b-7a8e86a25e8c_1600x.png?v=1754542865",
    price: 330000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da khô", "Da lão hóa"],
    volume: "100ml",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "sparkles-outline",
        title: "Tinh chất Nấm Truffle Trắng quý hiếm",
        subtitle: "Được mệnh danh là 'kim cương trong lòng đất', cung cấp dưỡng chất trẻ hóa da đỉnh cao"
      },
      {
        icon: "git-network-outline",
        title: "Lớp dầu thực vật Avocado & Sunflower",
        subtitle: "Cấu trúc 2 lớp dầu-nước lắc đều trước khi xịt, giữ ẩm sâu không để da bị mất nước ngược"
      }
    ],
    isActive: true,
  },
  {
    sku: "SER-LRP-027",
    name: "Serum La Roche-Posay Giảm Thâm Nám & Dưỡng Sáng Da 30ml",
    brand: "La Roche-Posay",
    description: "Mela B3 Serum. Đột phá hoạt chất Melasyl độc quyền đánh bay vết thâm nám lâu năm.",
    image: "https://product.hstatic.net/1000006063/product/bien_the_28614a04228c46b59f2c56e1e7d802e6_1024x1024.jpg",
    price: 928000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da xỉn màu"],
    volume: "30ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "star-outline",
        title: "Hoạt chất độc quyền Melasyl mới nhất",
        subtitle: "Đón đầu và triệt tiêu các hắc sắc tố melasyl tự do trước khi chúng chuyển thành vết thâm nám"
      },
      {
        icon: "trending-up-outline",
        title: "10% Niacinamide tinh khiết",
        subtitle: "Nồng độ cao phối hợp nhịp nhàng giúp xóa mờ các đốm nâu cứng đầu lâu năm, làm sáng tông da"
      }
    ],
    isActive: true,
  },
  {
    sku: "SER-LOR-028",
    name: "Serum L'Oreal Sáng Da, Mờ Thâm Mụn & Nám 30ml (Mới)",
    brand: "L'Oreal",
    description: "Glycolic Bright Melasyl 8%. Phức hợp mờ thâm dưỡng sáng da chỉ sau 2 tuần.",
    image: "https://media.hcdn.vn/catalog/product/g/o/google-shopping-serum-l-oreal-sang-da-mo-tham-mun-nam-30ml-1726195787_img_450x450_31d6f9_fit_center.jpg",
    price: 322000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da xỉn màu"],
    volume: "30ml",
    origin: "Indonesia",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "flask-outline",
        title: "Glycolic Acid (AHA) nồng độ tối ưu",
        subtitle: "Len lỏi tẩy nhẹ lớp sừng bề mặt, kích thích chu kỳ tái tạo da mờ vết thâm nhanh chóng"
      },
      {
        icon: "sparkles-outline",
        title: "Symwhite & Melasyl Complex 8%",
        subtitle: "Ức chế hoạt động của enzyme tyrosinase, giảm thâm mụn sạm màu rõ rệt chỉ sau 14 ngày"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-EMB-029",
    name: "Sữa Dưỡng Ẩm Embryolisse Siêu Phục Hồi Da 75ml",
    brand: "Embryolisse",
    description: "Lait-Crème Concentré. Kem dưỡng lót makeup đa năng được các chuyên gia trang điểm tin dùng.",
    image: "https://media.hcdn.vn/catalog/product/g/o/google-shopping-kem-sieu-duong-am-embryolisse-ho-tro-phuc-hoi-da-75ml-1680835901_img_450x450_31d6f9_fit_center.jpg",
    price: 390000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da khô", "Da thiếu nước"],
    volume: "75ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "Protein từ Đậu nành & Nha đam",
        subtitle: "Cung cấp các axit amin béo thiết yếu, làm mịn bề mặt bong tróc, thô ráp tức thì"
      },
      {
        icon: "brush-outline",
        title: "Kem lót đa năng chuẩn Backstage",
        subtitle: "Khóa màng dưỡng ẩm tuyệt hảo giúp lớp phấn nền mướt mịn, bám màu lâu và chống mốc sần mốc (cakey)"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-VIC-030",
    name: "Kem Dưỡng Vichy Sáng Da, Mờ Thâm Nám Ban Đêm 50ml",
    brand: "Vichy",
    description: "Liftactiv Collagen Specialist Night. Kích thích sinh collagen, ngăn ngừa lão hóa ban đêm.",
    image: "https://product.hstatic.net/1000006063/product/vichy_2_95e9ebf18412407f82e73b65c0d3b4db_1024x1024.jpg",
    price: 914000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da lão hóa"],
    volume: "50ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "pulse-outline",
        title: "Hoạt chất Peptide chuyên sâu",
        subtitle: "Kích hoạt khả năng sản sinh Collagen nội sinh tự nhiên, làm săn chắc cơ mặt khi ngủ"
      },
      {
        icon: "sunny-outline",
        title: "Vitamin CG tinh khiết",
        subtitle: "Dẫn xuất Vitamin C hiệu quả cao, bảo vệ cấu trúc tế bào và làm đều các mảng sạm sẫm màu"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-NEU-031",
    name: "Kem Dưỡng Ẩm Neutrogena Cấp Nước Cho Da Dầu 50g",
    brand: "Neutrogena",
    description: "Hydro Boost Hyaluronic Acid Water Gel. Dạng gel mướt mát, thấm nhanh không bít tắc.",
    image: "https://www.lottemart.vn/media/catalog/product/cache/0x0/4/8/4891080614470-1.jpg.webp",
    price: 207000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da dầu"],
    volume: "50g",
    origin: "Mỹ",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "water-outline",
        title: "Hyaluronic Acid phân tử nhỏ",
        subtitle: "Khả năng ngậm nước gấp 1000 lần trọng lượng của nó, bơm nước căng mọng cho làn da dầu"
      },
      {
        icon: "snow-outline",
        title: "Chiết xuất Olive (Olive Extract)",
        subtitle: "Tạo cấu trúc màng khóa ẩm tương thích với da, hạn chế tối đa hiện tượng thoát hơi nước"
      }
    ],
    isActive: true,
  },
  {
    sku: "CRE-OLA-032",
    name: "Kem Dưỡng Olay Luminous Sáng Da Mờ Thâm Nám Ban Đêm 50g",
    brand: "Olay",
    description: "Luminous Light Perfecting Night Cream. Nuôi dưỡng làn da trắng sáng mịn màng từ bên trong.",
    image: "https://newwaymart.vn/uploads/anh-san-pham-crawl/kem-duong-am-olay-ban-dem-lam-sang-da-mo-tham-nam-50g.jpg",
    price: 157000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường", "Da hỗn hợp"],
    volume: "50g",
    origin: "Thái Lan",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "sparkles-outline",
        title: "Tinh chất Niacinamide (99% tinh khiết)",
        subtitle: "Thúc đẩy chu kỳ đổi mới lớp tế bào sừng, đẩy lùi thâm nám sạm từ sâu trong biểu bì"
      },
      {
        icon: "leaf-outline",
        title: "Chiết xuất Anastatica (Cây hồi sinh)",
        subtitle: "Hấp thụ độ ẩm môi trường ban đêm, duy trì bề mặt da ngậm nước ẩm mượt rạng rỡ"
      }
    ],
    isActive: true,
  },
  {
    sku: "MAK-MAY-033",
    name: "Kem Nền Maybelline Bắt Sáng Che Phủ Siêu Nhẹ #110 35ml",
    brand: "Maybelline",
    description: "Superstay Up To 30H Lumi-Matte Foundation. Tông sáng tự nhiên, bền màu lâu trôi suốt 30 tiếng.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9dGj8CFS1-kacZgWxr32DG066aUInAOCb44LioLu8RSx4pRs_QLvOhUo&s=10",
    price: 220000,
    category: "Trang Điểm",
    skinTypes: ["Da thường", "Da dầu"],
    volume: "35ml",
    origin: "Trung Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "time-outline",
        title: "Hạt phấn mờ sương Lumi-Matte",
        subtitle: "Tạo hiệu ứng bắt sáng rạng rỡ nhưng vẫn kiềm dầu, giữ lớp nền bền màu lên đến 30 giờ"
      },
      {
        icon: "star-outline",
        title: "Tone #110 - Trắng Sáng Tự Nhiên",
        subtitle: "Độ che phủ cao, tiệp hẳn vào nền da mà không gây cảm giác nặng mặt hay bít tắc"
      }
    ],
    isActive: true,
  },
  {
    sku: "MAK-MAY-034",
    name: "Kem Nền Maybelline Bắt Sáng Che Phủ Siêu Nhẹ #111 35ml",
    brand: "Maybelline",
    description: "Superstay Up To 30H Lumi-Matte Foundation. Tông tự nhiên hơi ngả vàng phù hợp da châu Á.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqnzHyY6ht0RiZWoSc6opFCOOXmNsBfRdvlJlTe01VAi7fFUKI-Hj9sW4&s=10",
    price: 215000,
    category: "Trang Điểm",
    skinTypes: ["Da thường", "Da dầu"],
    volume: "35ml",
    origin: "Trung Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "color-wand-outline",
        title: "Công nghệ màng co giãn hạt màu",
        subtitle: "Giúp kem nền ôm khít mọi chuyển động của cơ mặt, chống trôi lem do mồ hôi tối đa"
      },
      {
        icon: "star-outline",
        title: "Tone #111 - Tự Nhiên Da Châu Á",
        subtitle: "Sắc vàng ấm tự nhiên giúp hiệu chỉnh màu da đồng đều, giấu nhẹm các khuyết điểm nhỏ"
      }
    ],
    isActive: true,
  },
  {
    sku: "ACC-HOT-035",
    name: "Combo 2 Bông Tẩy Trang Hotosu Cao Cấp 150 Miếng",
    brand: "Hotosu",
    description: "Premium Cotton Pads. 100% Cotton tự nhiên không xơ bông, siêu dai tiết kiệm toner.",
    image: "https://cdn.hstatic.net/products/200001117551/ezgif-7168a2e8e9b625ee_19eb969fdee14560892617eee9535c88_1024x1024.jpg",
    price: 55000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da thường/Mọi loại da"],
    volume: "150 miếng x 2",
    origin: "Việt Nam",
    expiryDate: "60 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "100% Sợi Cotton dệt tự nhiên",
        subtitle: "Bề mặt mềm xốp êm ái, thân thiện với cả làn da nhạy cảm nhất mà không lo để lại xơ bông"
      },
      {
        icon: "cut-outline",
        title: "Thiết kế dập viền siêu chắc chắn",
        subtitle: "Giúp bông không bị rách hay biến dạng khi kéo giãn, tối ưu lượng nước tẩy trang thẩm thấu"
      }
    ],
    isActive: true,
  },
  {
    sku: "MSK-CAR-038",
    name: "Combo 10 Mặt Nạ Caryophy Giảm Mụn, Thâm & Dưỡng Ẩm Da 22g",
    brand: "Caryophy",
    description: "Portulaca Mask Sheet 3in1. Làm dịu da mụn tức thì, cấp ẩm sâu.",
    image: "https://product.hstatic.net/200000150709/product/9038e4db7fafa9505db42d2c573327db_eb28bba3c11343049a2b37ad3ee0b5fa_1024x1024.jpg",
    price: 229000,
    category: "Chăm Sóc Da Mặt",
    skinTypes: ["Da mụn", "Da nhạy cảm"],
    volume: "22g x 10 miếng",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "Rau sam (Portulaca Oleracea)",
        subtitle: "Chứa hàm lượng lớn vitamin A, B1, B2, C giúp kháng khuẩn, hỗ trợ đẩy lùi vết mụn sưng"
      },
      {
        icon: "heart-outline",
        title: "Rau má & Glycerin thực vật",
        subtitle: "Cấp nước làm mát làn da đang tổn thương rát đỏ, làm mờ đi các vết thâm sau mụn"
      }
    ],
    isActive: true,
  },
  {
    sku: "CLEANSER-COSRX-001",
    name: "Low pH Good Morning Gel Cleanser",
    brand: "COSRX",
    description: "A gentle daily cleanser with a skin-friendly low pH.",
    image: "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
    ],
    price: 320000,
    originalPrice: 380000,
    category: "Cleanser",
    skinTypes: ["Oily", "Combination", "Sensitive"],
    volume: "150ml",
    origin: "Hàn Quốc",
    expiryDate: "36 tháng kể từ ngày sản xuất",
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
    isActive: true,
  },
  {
    sku: "SERUM-ORDINARY-001",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    description: "A lightweight serum for visible shine and uneven texture.",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    ],
    price: 290000,
    originalPrice: 350000,
    category: "Serum",
    skinTypes: ["Oily", "Combination", "Acne-prone"],
    volume: "30ml",
    origin: "Canada",
    expiryDate: "36 tháng kể từ ngày sản xuất",
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
    isActive: true,
  },
  {
    sku: "MOIST-CERAVE-001",
    name: "Moisturizing Cream",
    brand: "CeraVe",
    description: "A rich moisturizer with ceramides for the skin barrier.",
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
    ],
    price: 450000,
    originalPrice: null,
    category: "Moisturizer",
    skinTypes: ["Dry", "Normal", "Sensitive"],
    volume: "473ml",
    origin: "Mỹ",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "water-outline",
        title: "Phục hồi hàng rào da",
        subtitle: "3 loại Ceramides thiết yếu giúp củng cố hàng rào bảo vệ da",
      },
      {
        icon: "snow-outline",
        title: "Cấp ẩm chuyên sâu",
        subtitle: "Hyaluronic Acid giữ nước, giúp da căng mọng suốt 24 giờ",
      },
      {
        icon: "leaf-outline",
        title: "Công nghệ MVE độc quyền",
        subtitle: "Giải phóng dưỡng chất từ từ, duy trì hiệu quả cấp ẩm lâu dài",
      },
    ],
    isActive: true,
  },
  {
    sku: "SUNSCREEN-LRP-001",
    name: "Anthelios Invisible Fluid SPF 50+",
    brand: "La Roche-Posay",
    description: "Lightweight broad-spectrum daily sun protection.",
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    ],
    price: 520000,
    originalPrice: 600000,
    category: "Sunscreen",
    skinTypes: ["All"],
    volume: "50ml",
    origin: "Pháp",
    expiryDate: "36 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "sunny-outline",
        title: "Chống nắng phổ rộng",
        subtitle: "SPF 50+ PA++++ bảo vệ da khỏi tia UVA/UVB",
      },
      {
        icon: "shield-checkmark-outline",
        title: "Kết cấu mỏng nhẹ",
        subtitle: "Thấm nhanh, không gây bóng nhờn hay bít tắc lỗ chân lông",
      },
      {
        icon: "water-outline",
        title: "Nước khoáng núi lửa Pháp",
        subtitle: "Làm dịu da, giảm kích ứng khi tiếp xúc với ánh nắng",
      },
    ],
    isActive: true,
  },
  {
    sku: "COTTON-GUTA-010K",
    name: "Bông Tẩy Trang GUTA Cotton Mềm Mịn 80 Miếng",
    brand: "GUTA Cosmetic",
    description:
      "Bông tẩy trang cotton mềm, mỏng nhẹ, phù hợp dùng cùng toner hoặc nước tẩy trang hằng ngày.",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    ],
    price: 10000,
    originalPrice: null,
    category: "Phụ Kiện Chăm Sóc Da",
    skinTypes: ["Mọi loại da"],
    volume: "80 miếng",
    origin: "Việt Nam",
    expiryDate: "60 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "leaf-outline",
        title: "Sợi cotton mềm mại",
        subtitle: "Bề mặt êm, hạn chế xơ bông khi lau trên da.",
      },
      {
        icon: "water-outline",
        title: "Thấm hút vừa đủ",
        subtitle: "Phù hợp dùng với toner, lotion hoặc nước tẩy trang.",
      },
    ],
    isActive: true,
  },
  {
    sku: "COTTON-GUTA-015K",
    name: "Bông Tẩy Trang GUTA Premium Cotton 120 Miếng",
    brand: "GUTA Cosmetic",
    description:
      "Bông tẩy trang cotton dày dặn hơn, thấm tốt, dùng cho làm sạch da mặt và đắp lotion mask.",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    ],
    price: 15000,
    originalPrice: null,
    category: "Phụ Kiện Chăm Sóc Da",
    skinTypes: ["Mọi loại da", "Da nhạy cảm"],
    volume: "120 miếng",
    origin: "Việt Nam",
    expiryDate: "60 tháng kể từ ngày sản xuất",
    ingredients: [
      {
        icon: "shield-checkmark-outline",
        title: "Cotton dày dặn",
        subtitle: "Giữ form tốt, không dễ rách khi lau hoặc đắp lotion.",
      },
      {
        icon: "sparkles-outline",
        title: "Dịu nhẹ cho da",
        subtitle: "Phù hợp sử dụng hằng ngày cho nhiều loại da.",
      },
    ],
    isActive: true,
  },
];

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

    const stores = await Store.find({ isActive: true }).lean();

    for (const store of stores) {
      for (const savedProduct of savedProducts) {
        const existingInventory = await StoreInventory.findOne({
          storeId: store._id,
          productId: savedProduct._id,
        }).lean();

        if (existingInventory) {
          continue;
        }

        await StoreInventory.create({
          storeId: store._id,
          productId: savedProduct._id,
          totalStock: DEFAULT_STOCK_PER_STORE,
          reservedStock: 0,
          availableStock: DEFAULT_STOCK_PER_STORE,
        });
      }
    }

    console.log(
      `Seeded inventory for ${savedProducts.length} products across ${stores.length} store(s)`
    );
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
