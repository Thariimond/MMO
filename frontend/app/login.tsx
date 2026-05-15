// Login screen: Sign in with Google via Emergent auth.
import { useEffect } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth/AuthContext";
import { ASSETS, colors, radii, spacing } from "@/src/theme";

export default function LoginScreen() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/(tabs)/home");
  }, [user, router]);

  return (
    <View style={styles.container} testID="login-screen">
      <ImageBackground
        source={{ uri: ASSETS.background }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(10,11,16,0.3)", "rgba(10,11,16,0.85)", "rgba(10,11,16,1)"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.headerArea}>
        <Text style={styles.eyebrow}>ANIME • IDLE • MMORPG</Text>
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.title} testID="login-title">
          GALACTIC KI{"\n"}EMPIRE
        </Text>
        <Text style={styles.tagline}>
          Tap the ki orb. Forge alliances. Unleash your inner shounen hero.
        </Text>

        <Pressable
          onPress={() => void signIn()}
          disabled={loading}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            loading && styles.googleButtonDisabled,
          ]}
          testID="login-google-button"
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color={colors.bg} />
              <Text style={styles.googleButtonText}>SIGN IN WITH GOOGLE</Text>
            </>
          )}
        </Pressable>

        <View style={styles.feature}>
          <Feature icon="flash" label="Tap to channel Ki" />
          <Feature icon="people" label="Form Alliances" />
          <Feature icon="trophy" label="Global Rankings" />
        </View>

        <Text style={styles.legal}>
          By signing in you accept the Galactic Pact. Save progress across devices.
        </Text>
      </View>
    </View>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerArea: {
    flex: 1,
    paddingTop: spacing.xxl * 2,
    alignItems: "center",
  },
  eyebrow: {
    color: colors.primary,
    letterSpacing: 4,
    fontSize: 11,
    fontWeight: "700",
  },
  contentArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 1.5,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
    textTransform: "uppercase",
    textShadowColor: colors.primaryGlow,
    textShadowRadius: 18,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  googleButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  googleButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  googleButtonDisabled: { opacity: 0.6 },
  googleButtonText: {
    color: colors.bg,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontSize: 15,
  },
  feature: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },
  featureItem: { alignItems: "center", flex: 1 },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  legal: {
    color: colors.textDisabled,
    fontSize: 11,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
