import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import * as authService from "@/services/authService";
import {
  OtpRequestResponse,
  RegisterPayload,
  User,
} from "@/types/user";

const TOKEN_STORAGE_KEY = "guta_cosmetic_token";
const USER_STORAGE_KEY = "guta_cosmetic_user";

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  requestRegistrationOtp: (
    payload: RegisterPayload
  ) => Promise<OtpRequestResponse>;
  verifyRegistrationOtp: (
    challengeId: string,
    otp: string
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
        }
      } catch {
        await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const persistSession = async (nextUser: User, nextToken: string) => {
    await AsyncStorage.multiSet([
      [TOKEN_STORAGE_KEY, nextToken],
      [USER_STORAGE_KEY, JSON.stringify(nextUser)],
    ]);
    setUser(nextUser);
    setToken(nextToken);
  };

  const login = async (identifier: string, password: string) => {
    const response = await authService.login({ identifier, password });
    await persistSession(response.user, response.token);
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authService.loginWithGoogle(idToken);
    await persistSession(response.user, response.token);
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
    await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        login,
        loginWithGoogle,
        logout,
        requestRegistrationOtp,
        token,
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
