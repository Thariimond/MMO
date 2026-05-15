// Bottom tab navigator for authenticated users. Guards unauthenticated access.
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/auth/AuthContext";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        tabBarBackground: () => (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarStyle: {
          backgroundColor: "rgba(10,11,16,0.85)",
          borderTopColor: colors.borderDefault,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          position: "absolute",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Battle",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" color={color} size={size} />,
          tabBarTestID: "nav-home-tab",
        }}
      />
      <Tabs.Screen
        name="upgrades"
        options={{
          title: "Upgrades",
          tabBarIcon: ({ color, size }) => <Ionicons name="rocket" color={color} size={size} />,
          tabBarTestID: "nav-upgrades-tab",
        }}
      />
      <Tabs.Screen
        name="alliance"
        options={{
          title: "Alliance",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          tabBarTestID: "nav-alliance-tab",
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Ranks",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
          tabBarTestID: "nav-leaderboard-tab",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          tabBarTestID: "nav-profile-tab",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
