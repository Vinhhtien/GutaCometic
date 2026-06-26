import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CategoryScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons color="#2d5a4b" name="grid-outline" size={26} />
        </View>
        <Text style={styles.emptyTitle}>Danh mục sắp ra mắt</Text>
        <Text style={styles.emptyMessage}>
          Chúng tôi vẫn đang xây dựng phần này.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#eaf2ee",
  },
  emptyTitle: {
    marginTop: 14,
    color: "#2d2e2c",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyMessage: {
    maxWidth: 290,
    marginTop: 7,
    color: "#747673",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
