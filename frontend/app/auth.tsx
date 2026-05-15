// Auth redirect handler: processes the session_id from the OAuth redirect
// This route handles deep links coming back from the auth provider
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { colors } from "@/src/theme";

export default function AuthRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (user && !loading) {
      router.replace("/(tabs)/home");
    }
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
