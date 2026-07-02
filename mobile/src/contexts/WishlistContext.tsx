import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWishlist,
  toggleWishlist as toggleWishlistRequest,
} from "@/services/wishlistService";
import { Product } from "@/types/product";

type WishlistContextValue = {
  products: Product[];
  isLoading: boolean;
  isLiked: (productId: string) => boolean;
  toggleLike: (product: Product) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined
);

export function WishlistProvider({ children }: PropsWithChildren) {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      setProducts(await getWishlist(token));
    } catch {
      // Keep the previous list on a failed refresh.
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    refresh();
  }, [user, refresh]);

  const isLiked = (productId: string) =>
    products.some((product) => product._id === productId);

  const toggleLike = async (product: Product) => {
    if (!token) {
      return;
    }

    const wasLiked = isLiked(product._id);

    setProducts((current) =>
      wasLiked
        ? current.filter((item) => item._id !== product._id)
        : [...current, product]
    );

    try {
      await toggleWishlistRequest(token, product._id);
    } catch {
      setProducts((current) =>
        wasLiked
          ? [...current, product]
          : current.filter((item) => item._id !== product._id)
      );
    }
  };

  const value: WishlistContextValue = {
    isLiked,
    isLoading,
    products,
    refresh,
    toggleLike,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}
