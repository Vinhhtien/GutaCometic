import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getHomeRouteForRole } from "@/utils/roleNavigation";

export default function ManagerLayout() {
  const { isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/auth/login" />;
  }

  if (!isLoading && user?.role !== "MANAGER") {
    return <Redirect href={getHomeRouteForRole(user?.role)} />;
  }

  if (isLoading || !user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <ActivityIndicator color="#252525" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
