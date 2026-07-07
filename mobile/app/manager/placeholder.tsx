import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ManagerPlaceholderScreen() {
  const { description, title } = useLocalSearchParams<{
    description?: string;
    title?: string;
  }>();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color="#252525" name="arrow-back" size={21} />
        </Pressable>
        <Text style={styles.headerTitle}>{title || "Chức năng"}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons color="#252525" name="construct-outline" size={32} />
        </View>
        <Text style={styles.title}>{title || "Chức năng đang phát triển"}</Text>
        <Text style={styles.description}>
          {description ||
            "Màn hình này sẽ được triển khai ở giai đoạn tiếp theo."}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Quay lại dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: 12,
    color: "#1f2522",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e8e1",
  },
  title: {
    marginTop: 18,
    color: "#1f2522",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: "#69756f",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  button: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#252525",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
});
