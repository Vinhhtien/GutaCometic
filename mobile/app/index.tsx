import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function IndexScreen() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  return <Redirect href={user ? "/home" : "/login"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
