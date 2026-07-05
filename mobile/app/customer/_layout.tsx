import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function CustomerLayout() {
  const { isLoading, user } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/auth/login" />;
  }

  if (isLoading || !user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#2d5a4b" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="product-detail"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="cart"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="wishlist"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="order-detail"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="write-review"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="filter"
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: "slide_from_right",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
