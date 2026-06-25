import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function CustomerTabsLayout() {
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
        <ActivityIndicator size="large" color="#d9475c" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#d9475c",
        tabBarInactiveTintColor: "#8c8c8c",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: {
          height: 68,
          borderTopColor: "#dedfdb",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person" size={size} />
          ),
        }}
      />
      {/* Ẩn các màn hình phụ khỏi thanh bottom tab nhưng vẫn giữ trong navigator để không mất Bottom Tabs khi điều hướng */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen 
        name="edit-profile" 
        options={{ 
          href: null 
        }} 
      />
    </Tabs>
  );
}
