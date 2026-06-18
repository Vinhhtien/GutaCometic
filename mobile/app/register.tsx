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
import { Link, Redirect, router } from "expo-router";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/services/api";

export default function RegisterScreen() {
  const { isLoading, register, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/home" />;
  }

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !phone.trim() ||
      !address.trim()
    ) {
      Alert.alert("Missing information", "Complete all fields to continue.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Invalid password", "Use at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      await register({ fullName, email, password, phone, address });
      router.replace("/home");
    } catch (error) {
      Alert.alert("Registration failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
          <Text style={styles.title}>Join GUTA Cosmetic</Text>
          <Text style={styles.subtitle}>
            Your new account starts with the Customer role.
          </Text>

          <FormInput
            autoComplete="name"
            label="Full name"
            onChangeText={setFullName}
            placeholder="Nguyen Van A"
            value={fullName}
          />
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
            autoComplete="new-password"
            label="Password"
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
          />
          <FormInput
            autoComplete="tel"
            keyboardType="phone-pad"
            label="Phone"
            onChangeText={setPhone}
            placeholder="0901234567"
            value={phone}
          />
          <FormInput
            autoComplete="street-address"
            label="Address"
            multiline
            onChangeText={setAddress}
            placeholder="Your delivery address"
            value={address}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>
            Already registered?{" "}
            <Link href="/login" style={styles.link}>
              Sign in
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff1f5",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 48,
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
