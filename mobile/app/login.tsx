import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, router } from "expo-router";
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

export default function LoginScreen() {
  const { isLoading, login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/home" />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Login failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
                autoComplete="email"
                icon="mail-outline"
                keyboardType="email-address"
                label="Email address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
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

              <Pressable style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

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
