import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { isStaffRole } from "@/constants/session";
import { getHomeRouteForRole } from "@/utils/roleNavigation";

export default function IndexScreen() {
  const { activeStore, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  if (isStaffRole(user.role) && !activeStore) {
    return <Redirect href="/staff/select-store" />;
  }

  return <Redirect href={getHomeRouteForRole(user.role)} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
