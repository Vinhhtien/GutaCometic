import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as authService from "@/services/authService";
import { ACTIVE_STORE_STORAGE_KEY } from "@/constants/session";
import { Store } from "@/types/store";
import {
  OtpRequestResponse,
  RegisterPayload,
  User,
} from "@/types/user";

const TOKEN_STORAGE_KEY = "guta_cosmetic_token";
const USER_STORAGE_KEY = "guta_cosmetic_user";

type AuthContextValue = {
  activeStore: Store | null;
  isLoading: boolean;
  token: string | null;
  user: User | null;
  login: (identifier: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  selectActiveStore: (store: Store) => Promise<void>;
  clearActiveStore: () => Promise<void>;
  requestRegistrationOtp: (
    payload: RegisterPayload
  ) => Promise<OtpRequestResponse>;
  verifyRegistrationOtp: (
    challengeId: string,
    otp: string
  ) => Promise<void>;
  updateUserContext: (nextUser: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser, storedActiveStore] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_STORE_STORAGE_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
          setActiveStore(
            storedActiveStore ? (JSON.parse(storedActiveStore) as Store) : null
          );
        }
      } catch {
        await AsyncStorage.multiRemove([
          TOKEN_STORAGE_KEY,
          USER_STORAGE_KEY,
          ACTIVE_STORE_STORAGE_KEY,
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const persistSession = async (nextUser: User, nextToken: string) => {
    await AsyncStorage.multiRemove([ACTIVE_STORE_STORAGE_KEY]);
    await AsyncStorage.multiSet([
      [TOKEN_STORAGE_KEY, nextToken],
      [USER_STORAGE_KEY, JSON.stringify(nextUser)],
    ]);
    setUser(nextUser);
    setToken(nextToken);
    setActiveStore(null);
  };

  const login = async (identifier: string, password: string) => {
    const response = await authService.login({ identifier, password });
    await persistSession(response.user, response.token);
    return response.user;
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authService.loginWithGoogle(idToken);
    await persistSession(response.user, response.token);
    return response.user;
  };

  const requestRegistrationOtp = (payload: RegisterPayload) =>
    authService.requestRegistrationOtp(payload);

  const verifyRegistrationOtp = async (
    challengeId: string,
    otp: string
  ) => {
    const response = await authService.verifyRegistrationOtp({
      challengeId,
      otp,
    });
    await persistSession(response.user, response.token);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      TOKEN_STORAGE_KEY,
      USER_STORAGE_KEY,
      ACTIVE_STORE_STORAGE_KEY,
    ]);
    setUser(null);
    setToken(null);
    setActiveStore(null);
  };

  const selectActiveStore = useCallback(async (store: Store) => {
    await AsyncStorage.setItem(ACTIVE_STORE_STORAGE_KEY, JSON.stringify(store));
    setActiveStore(store);
  }, []);

  const clearActiveStore = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
    setActiveStore(null);
  }, []);

  const updateUserContext = useCallback(async (nextUser: User) => {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const response = await authService.getCurrentUser(token);
    await updateUserContext(response.user);
    return response.user;
  }, [token, updateUserContext]);

  return (
    <AuthContext.Provider
      value={{
        activeStore,
        clearActiveStore,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
        selectActiveStore,
        requestRegistrationOtp,
        token,
        updateUserContext,
        user,
        verifyRegistrationOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
