import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getHomeRouteForRole } from "@/utils/roleNavigation";

export default function SalesLayout() {
  const { activeStore, isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/auth/login" />;
  }

  if (!isLoading && user?.role !== "SALES") {
    return <Redirect href={getHomeRouteForRole(user?.role)} />;
  }

  if (!isLoading && user?.role === "SALES" && !activeStore) {
    return <Redirect href="/staff/select-store" />;
  }

  if (isLoading || !user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f7f4",
        }}
      >
        <ActivityIndicator color="#252525" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
