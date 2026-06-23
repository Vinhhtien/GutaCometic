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
import {
  FieldErrors,
  validateOtp,
  validateRegistration,
} from "@/utils/authValidation";

type RegistrationStep = "FORM" | "OTP";

export default function RegisterScreen() {
  const {
    isLoading,
    requestRegistrationOtp,
    user,
    verifyRegistrationOtp,
  } = useAuth();
  const [step, setStep] = useState<RegistrationStep>("FORM");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/home" />;
  }

  const registrationPayload = {
    address,
    confirmPassword,
    email,
    fullName,
    password,
    phone,
  };

  const handleRequestOtp = async () => {
    const validationErrors = validateRegistration(registrationPayload);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      Alert.alert("Check your information", "Correct the highlighted fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await requestRegistrationOtp(registrationPayload);
      setChallengeId(response.challengeId);
      setDeliveryTarget(response.deliveryTarget);
      setOtp("");
      setStep("OTP");
    } catch (error) {
      Alert.alert("Unable to send OTP", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const validationError = validateOtp(otp);
    setOtpError(validationError);

    if (validationError) {
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyRegistrationOtp(challengeId, otp);
      router.replace("/home");
    } catch (error) {
      Alert.alert("OTP verification failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (
    setter: (value: string) => void,
    field: string,
    value: string
  ) => {
    setter(value);
    setErrors((current) => ({ ...current, [field]: "" }));
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
            <Text style={styles.headerTitle}>
              {step === "FORM" ? "Create your account" : "Verify your Gmail"}
            </Text>
            <Text style={styles.headerCopy}>
              {step === "FORM"
                ? "A verified Gmail address is required for Customer membership."
                : `Enter the 6-digit code sent to ${deliveryTarget}.`}
            </Text>
          </View>

          <View style={styles.formSection}>
            {step === "FORM" ? (
              <>
                <View style={styles.roleNotice}>
                  <Ionicons
                    color="#2d5a4b"
                    name="shield-checkmark-outline"
                    size={22}
                  />
                  <View style={styles.roleNoticeCopy}>
                    <Text style={styles.roleNoticeTitle}>
                      Verified Customer account
                    </Text>
                    <Text style={styles.roleNoticeText}>
                      Your account is created only after OTP verification.
                    </Text>
                  </View>
                </View>

                <FormInput
                  autoComplete="name"
                  error={errors.fullName}
                  icon="person-outline"
                  label="Full name"
                  onChangeText={(value) =>
                    updateField(setFullName, "fullName", value)
                  }
                  placeholder="Nguyen Van A"
                  value={fullName}
                />
                <FormInput
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email}
                  icon="mail-outline"
                  keyboardType="email-address"
                  label="Gmail address"
                  onChangeText={(value) => updateField(setEmail, "email", value)}
                  placeholder="you@gmail.com"
                  value={email}
                />
                <FormInput
                  autoComplete="tel"
                  error={errors.phone}
                  icon="call-outline"
                  keyboardType="phone-pad"
                  label="Phone number"
                  onChangeText={(value) => updateField(setPhone, "phone", value)}
                  placeholder="0901234567"
                  value={phone}
                />
                <FormInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  error={errors.password}
                  icon="lock-closed-outline"
                  label="Password"
                  onChangeText={(value) =>
                    updateField(setPassword, "password", value)
                  }
                  placeholder="Uppercase, lowercase and number"
                  secureTextEntry
                  value={password}
                />
                <FormInput
                  autoCapitalize="none"
                  error={errors.confirmPassword}
                  icon="checkmark-circle-outline"
                  label="Confirm password"
                  onChangeText={(value) =>
                    updateField(setConfirmPassword, "confirmPassword", value)
                  }
                  placeholder="Enter password again"
                  secureTextEntry
                  value={confirmPassword}
                />
                <FormInput
                  autoComplete="street-address"
                  error={errors.address}
                  icon="location-outline"
                  label="Delivery address"
                  multiline
                  onChangeText={(value) =>
                    updateField(setAddress, "address", value)
                  }
                  placeholder="Enter your address"
                  value={address}
                />

                <ActionButton
                  isLoading={isSubmitting}
                  label="Send Gmail OTP"
                  onPress={handleRequestOtp}
                />
              </>
            ) : (
              <>
                <FormInput
                  error={otpError}
                  icon="keypad-outline"
                  keyboardType="number-pad"
                  label="6-digit OTP"
                  maxLength={6}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, ""));
                    setOtpError("");
                  }}
                  placeholder="000000"
                  value={otp}
                />

                <ActionButton
                  isLoading={isSubmitting}
                  label="Verify and create account"
                  onPress={handleVerifyOtp}
                />

                <Pressable
                  onPress={() => {
                    setStep("FORM");
                    setOtp("");
                    setOtpError("");
                  }}
                  style={styles.secondaryButton}
                >
                  <Ionicons color="#2d5a4b" name="arrow-back" size={17} />
                  <Text style={styles.secondaryButtonText}>
                    Change registration details
                  </Text>
                </Pressable>
              </>
            )}

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

function ActionButton({
  isLoading,
  label,
  onPress,
}: {
  isLoading: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        isLoading && styles.buttonDisabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text style={styles.buttonText}>{label}</Text>
          <Ionicons color="#ffffff" name="arrow-forward" size={18} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, backgroundColor: "#ffffff" },
  header: {
    padding: 26,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: "#2d5a4b",
  },
  brandLine: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 7,
  },
  brand: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  headerTitle: {
    marginTop: 25,
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
  },
  headerCopy: {
    maxWidth: 440,
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
  roleNoticeCopy: { flex: 1 },
  roleNoticeTitle: { color: "#284f42", fontSize: 13, fontWeight: "800" },
  roleNoticeText: {
    marginTop: 2,
    color: "#60736c",
    fontSize: 12,
    lineHeight: 17,
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
  buttonPressed: { opacity: 0.84 },
  buttonDisabled: { opacity: 0.58 },
  buttonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
  },
  secondaryButtonText: { color: "#2d5a4b", fontSize: 13, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginTop: 24,
  },
  footerText: { color: "#777976", fontSize: 13 },
  link: { color: "#c33e53", fontSize: 13, fontWeight: "800" },
});
