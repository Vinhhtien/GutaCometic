import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

const ACTIVE_COLOR = "#2d5a4b";
const INACTIVE_COLOR = "#8c8c8c";

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 8,
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: "0 -2px 10px rgba(37, 37, 37, 0.06)",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "home" : "home-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="category"
        options={{
          title: "Danh mục",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "grid" : "grid-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Đơn hàng",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "receipt" : "receipt-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "person" : "person-outline"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
