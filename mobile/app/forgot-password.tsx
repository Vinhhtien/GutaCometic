import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
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
import * as authService from "@/services/authService";
import { getErrorMessage } from "@/services/api";
import {
  FieldErrors,
  validateLoginIdentifier,
  validateNewPassword,
  validateOtp,
} from "@/utils/authValidation";

type ResetStep = "IDENTIFIER" | "OTP" | "PASSWORD";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<ResetStep>("IDENTIFIER");
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestOtp = async () => {
    const error = validateLoginIdentifier(identifier);
    setIdentifierError(error);

    if (error) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authService.requestPasswordResetOtp(identifier);
      setChallengeId(response.challengeId);
      setDeliveryTarget(response.deliveryTarget);
      setStep("OTP");
    } catch (requestError) {
      Alert.alert("Unable to request OTP", getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtpCode = async () => {
    const error = validateOtp(otp);
    setOtpError(error);

    if (error) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authService.verifyPasswordResetOtp(
        challengeId,
        otp
      );
      setResetToken(response.resetToken);
      setStep("PASSWORD");
    } catch (requestError) {
      Alert.alert("OTP verification failed", getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePassword = async () => {
    const errors = validateNewPassword(password, confirmPassword);
    setPasswordErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.resetPassword(
        resetToken,
        password,
        confirmPassword
      );
      Alert.alert("Password updated", "Sign in with your new password.", [
        { text: "Continue", onPress: () => router.replace("/login") },
      ]);
    } catch (requestError) {
      Alert.alert("Unable to reset password", getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = {
    IDENTIFIER: "Recover your account",
    OTP: "Verify your OTP",
    PASSWORD: "Create a new password",
  }[step];

  const subtitle = {
    IDENTIFIER:
      "Enter your Gmail or phone number. The OTP will be sent to your registered Gmail.",
    OTP: `Enter the 6-digit code for ${deliveryTarget}.`,
    PASSWORD: "Your new password will replace the old one immediately.",
  }[step];

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
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons color="#ffffff" name="arrow-back" size={21} />
            </Pressable>
            <Text style={styles.brand}>GUTA COSMETIC</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.formSection}>
            {step === "IDENTIFIER" ? (
              <>
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
                <ActionButton
                  isLoading={isSubmitting}
                  label="Send OTP"
                  onPress={requestOtp}
                />
              </>
            ) : null}

            {step === "OTP" ? (
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
                  label="Verify OTP"
                  onPress={verifyOtpCode}
                />
              </>
            ) : null}

            {step === "PASSWORD" ? (
              <>
                <FormInput
                  error={passwordErrors.password}
                  icon="lock-closed-outline"
                  label="New password"
                  onChangeText={(value) => {
                    setPassword(value);
                    setPasswordErrors((current) => ({
                      ...current,
                      password: "",
                    }));
                  }}
                  placeholder="Uppercase, lowercase and number"
                  secureTextEntry
                  value={password}
                />
                <FormInput
                  error={passwordErrors.confirmPassword}
                  icon="checkmark-circle-outline"
                  label="Confirm new password"
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setPasswordErrors((current) => ({
                      ...current,
                      confirmPassword: "",
                    }));
                  }}
                  placeholder="Enter password again"
                  secureTextEntry
                  value={confirmPassword}
                />
                <ActionButton
                  isLoading={isSubmitting}
                  label="Update password"
                  onPress={updatePassword}
                />
              </>
            ) : null}

            <View style={styles.footer}>
              <Link href="/login" style={styles.link}>
                Return to sign in
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
      style={[styles.actionButton, isLoading && styles.buttonDisabled]}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text style={styles.actionButtonText}>{label}</Text>
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
    minHeight: 245,
    justifyContent: "flex-end",
    padding: 27,
    paddingBottom: 30,
    backgroundColor: "#2d5a4b",
  },
  backButton: {
    position: "absolute",
    top: 24,
    left: 24,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 7,
  },
  brand: { color: "#d9e6e1", fontSize: 12, fontWeight: "900" },
  title: {
    marginTop: 11,
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
  },
  subtitle: {
    maxWidth: 430,
    marginTop: 8,
    color: "#d9e6e1",
    fontSize: 14,
    lineHeight: 21,
  },
  formSection: {
    width: "100%",
    maxWidth: 530,
    alignSelf: "center",
    padding: 25,
    paddingTop: 31,
  },
  actionButton: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 5,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  actionButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.58 },
  footer: { alignItems: "center", marginTop: 25 },
  link: { color: "#c33e53", fontSize: 13, fontWeight: "800" },
});
