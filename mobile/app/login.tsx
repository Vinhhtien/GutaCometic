import { Ionicons } from "@expo/vector-icons";
import { Href, Link, Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";
import { getGoogleIdToken } from "@/services/googleSignIn";
import { validateLoginIdentifier } from "@/utils/authValidation";

export default function LoginScreen() {
  const { isLoading, login, loginWithGoogle, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/home" />;
  }

  const handleLogin = async () => {
    const validationError = validateLoginIdentifier(identifier);
    setIdentifierError(validationError);

    if (validationError || !password) {
      Alert.alert(
        "Invalid information",
        validationError || "Enter your password."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await login(identifier, password);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Login failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleSubmitting(true);
      const idToken = await getGoogleIdToken();
      await loginWithGoogle(idToken);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Google Sign-In failed", getErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandPanel}>
            <View style={styles.brandMark}>
              <Ionicons color="#ffffff" name="leaf-outline" size={26} />
            </View>
            <Text style={styles.brand}>GUTA COSMETIC</Text>
            <Text style={styles.brandMessage}>
              Professional skincare, thoughtfully selected.
            </Text>
            <View style={styles.brandAccent} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Sign in to your account</Text>
            <Text style={styles.subtitle}>
              Continue shopping and keep your skincare routine in one place.
            </Text>

            <View style={styles.form}>
              <FormInput
                autoCapitalize="none"
                error={identifierError}
                icon="person-outline"
                label="Gmail or phone number"
                onChangeText={(value) => {
                  setIdentifier(value);
                  setIdentifierError("");
                }}
                placeholder="you@gmail.com or 0901234567"
                value={identifier}
              />
              <FormInput
                autoCapitalize="none"
                autoComplete="password"
                icon="lock-closed-outline"
                label="Password"
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
              />

              <Link
                href={"/forgot-password" as Href}
                style={[styles.forgotButton, styles.forgotText]}
              >
                Forgot password?
              </Link>

              <Pressable
                disabled={isSubmitting}
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  isSubmitting && styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign in</Text>
                    <Ionicons color="#ffffff" name="arrow-forward" size={18} />
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                disabled={isGoogleSubmitting}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.buttonPressed,
                  isGoogleSubmitting && styles.buttonDisabled,
                ]}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator color="#252525" />
                ) : (
                  <>
                    <Ionicons color="#4285f4" name="logo-google" size={20} />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to GUTA Cosmetic?</Text>
              <Link href="/register" style={styles.link}>
                Create an account
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
  },
  brandPanel: {
    minHeight: 235,
    justifyContent: "flex-end",
    padding: 28,
    paddingBottom: 31,
    backgroundColor: "#2d5a4b",
  },
  brandMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 8,
  },
  brand: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
  },
  brandMessage: {
    maxWidth: 310,
    marginTop: 7,
    color: "#d9e6e1",
    fontSize: 14,
    lineHeight: 21,
  },
  brandAccent: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 92,
    height: 7,
    backgroundColor: "#d9475c",
  },
  formSection: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 26,
    paddingTop: 32,
  },
  eyebrow: {
    color: "#d9475c",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
  },
  title: {
    marginTop: 8,
    color: "#252525",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 33,
  },
  subtitle: {
    marginTop: 9,
    color: "#717370",
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    marginTop: 26,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 20,
  },
  forgotText: {
    color: "#c33e53",
    fontSize: 13,
    fontWeight: "800",
  },
  button: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#d9dddb" },
  dividerText: { color: "#868b88", fontSize: 11, fontWeight: "800" },
  googleButton: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ccd2cf",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  googleButtonText: { color: "#252525", fontSize: 14, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginTop: 25,
  },
  footerText: {
    color: "#777976",
    fontSize: 13,
  },
  link: {
    color: "#c33e53",
    fontSize: 13,
    fontWeight: "800",
  },
});
