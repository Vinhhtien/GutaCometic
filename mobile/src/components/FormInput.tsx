import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type FormInputProps = TextInputProps & {
  label: string;
};

export function FormInput({ label, multiline, style, ...props }: FormInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor="#94a3b8"
        style={[styles.input, multiline && styles.multilineInput, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 7,
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 13,
    paddingHorizontal: 14,
    color: "#172033",
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  multilineInput: {
    minHeight: 86,
    paddingTop: 14,
    textAlignVertical: "top",
  },
});
