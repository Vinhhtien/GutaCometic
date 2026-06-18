import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AddToCartInput, CartItem } from "@/types/cart";

const CART_STORAGE_PREFIX = "guta_cosmetic_cart";

type CartContextValue = {
  items: CartItem[];
  isLoading: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (input: AddToCartInput) => void;
  clearCart: () => Promise<void>;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const getStorageKey = (userId: string) =>
  `${CART_STORAGE_PREFIX}_${userId}`;

export function CartProvider({ children }: PropsWithChildren) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const restoreCart = async () => {
        if (isAuthLoading) {
          return;
        }

        if (!user) {
          loadedUserId.current = null;
          setItems([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        try {
          const storedCart = await AsyncStorage.getItem(
            getStorageKey(user._id)
          );
          setItems(storedCart ? (JSON.parse(storedCart) as CartItem[]) : []);
        } catch {
          setItems([]);
          await AsyncStorage.removeItem(getStorageKey(user._id));
        } finally {
          loadedUserId.current = user._id;
          setIsLoading(false);
        }
      };

      restoreCart();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (
      isLoading ||
      !user ||
      loadedUserId.current !== user._id
    ) {
      return;
    }

    AsyncStorage.setItem(getStorageKey(user._id), JSON.stringify(items)).catch(
      () => undefined
    );
  }, [isLoading, items, user]);

  const addItem = ({ product, quantity = 1 }: AddToCartInput) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product._id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...currentItems,
        {
          productId: product._id,
          sku: product.sku,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          quantity,
        },
      ];
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity)) {
      return;
    }

    if (quantity <= 0) {
      setItems((currentItems) =>
        currentItems.filter((item) => item.productId !== productId)
      );
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId)
    );
  };

  const clearCart = async () => {
    setItems([]);

    if (user) {
      await AsyncStorage.removeItem(getStorageKey(user._id));
    }
  };

  const value = {
    addItem,
    clearCart,
    isLoading,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    removeItem,
    setQuantity,
    subtotal: items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
