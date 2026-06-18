import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, Redirect, router } from "expo-router";
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>GUTA COSMETIC POS</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to manage your skincare experience.
        </Text>

        <FormInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <FormInput
          autoCapitalize="none"
          autoComplete="password"
          label="Password"
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
        />

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
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          New to GUTA Cosmetic?{" "}
          <Link href="/register" style={styles.link}>
            Create an account
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff1f5",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#831843",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  eyebrow: {
    marginBottom: 10,
    color: "#db2777",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#172033",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#db2777",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 24,
    color: "#64748b",
    textAlign: "center",
  },
  link: {
    color: "#be185d",
    fontWeight: "700",
  },
});
