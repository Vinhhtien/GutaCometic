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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.brandLine}>
              <View style={styles.brandMark}>
                <Ionicons color="#ffffff" name="leaf-outline" size={21} />
              </View>
              <Text style={styles.brand}>GUTA COSMETIC</Text>
            </View>
            <Text style={styles.headerTitle}>Create your account</Text>
            <Text style={styles.headerCopy}>
              Shop online, collect points and manage orders across every GUTA
              store.
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.roleNotice}>
              <Ionicons color="#2d5a4b" name="person-circle-outline" size={22} />
              <View style={styles.roleNoticeCopy}>
                <Text style={styles.roleNoticeTitle}>Customer membership</Text>
                <Text style={styles.roleNoticeText}>
                  Your account starts with the Customer role.
                </Text>
              </View>
            </View>

            <FormInput
              autoComplete="name"
              icon="person-outline"
              label="Full name"
              onChangeText={setFullName}
              placeholder="Nguyen Van A"
              value={fullName}
            />
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
              autoComplete="new-password"
              icon="lock-closed-outline"
              label="Password"
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              value={password}
            />
            <FormInput
              autoComplete="tel"
              icon="call-outline"
              keyboardType="phone-pad"
              label="Phone number"
              onChangeText={setPhone}
              placeholder="0901234567"
              value={phone}
            />
            <FormInput
              autoComplete="street-address"
              icon="location-outline"
              label="Delivery address"
              multiline
              onChangeText={setAddress}
              placeholder="Enter your address"
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
                <>
                  <Text style={styles.buttonText}>Create account</Text>
                  <Ionicons color="#ffffff" name="arrow-forward" size={18} />
                </>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already registered?</Text>
              <Link href="/login" style={styles.link}>
                Sign in
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
  header: {
    padding: 26,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: "#2d5a4b",
  },
  brandLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 7,
  },
  brand: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
  headerTitle: {
    marginTop: 25,
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
  },
  headerCopy: {
    maxWidth: 430,
    marginTop: 8,
    color: "#d9e6e1",
    fontSize: 14,
    lineHeight: 21,
  },
  formSection: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 25,
    paddingTop: 26,
    paddingBottom: 38,
  },
  roleNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 23,
    borderWidth: 1,
    borderColor: "#cbd9d4",
    borderRadius: 8,
    padding: 13,
    backgroundColor: "#f0f6f3",
  },
  roleNoticeCopy: {
    flex: 1,
  },
  roleNoticeTitle: {
    color: "#284f42",
    fontSize: 13,
    fontWeight: "800",
  },
  roleNoticeText: {
    marginTop: 2,
    color: "#60736c",
    fontSize: 12,
  },
  button: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 5,
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
    marginTop: 24,
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
