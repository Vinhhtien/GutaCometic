import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type FormInputProps = TextInputProps & {
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
};

export function FormInput({
  error,
  icon,
  label,
  multiline,
  style,
  ...props
}: FormInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          multiline && styles.multilineShell,
          error && styles.inputShellError,
        ]}
      >
        {icon ? (
          <Ionicons
            color="#747673"
            name={icon}
            size={19}
            style={multiline ? styles.multilineIcon : undefined}
          />
        ) : null}
        <TextInput
          multiline={multiline}
          placeholderTextColor="#9a9c98"
          style={[styles.input, multiline && styles.multilineInput, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: "#383a37",
    fontSize: 13,
    fontWeight: "800",
  },
  inputShell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#d9dad6",
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
  },
  multilineShell: {
    alignItems: "flex-start",
    minHeight: 92,
  },
  inputShellError: {
    borderColor: "#c33e53",
  },
  multilineIcon: {
    marginTop: 15,
  },
  input: {
    flex: 1,
    minHeight: 50,
    color: "#252525",
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 6,
    color: "#b4233a",
    fontSize: 11,
    lineHeight: 15,
  },
});
