// Profile screen: avatar, stats grid, achievements teaser, logout.
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth/AuthContext";
import { useGameState } from "@/src/hooks/useGameState";
import { ASSETS, colors, radii, spacing } from "@/src/theme";
import { formatKi, formatRate } from "@/src/utils/format";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { state, loading } = useGameState();

  if (loading || !state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const achievements = [
    {
      id: "first_tap",
      name: "First Spark",
      detail: "Channel ki for the first time",
      unlocked: state.tap_count > 0,
      icon: "flash" as const,
    },
    {
      id: "thousand",
      name: "Kilo Master",
      detail: "Earn 1,000 total ki",
      unlocked: state.total_ki_earned >= 1000,
      icon: "trophy" as const,
    },
    {
      id: "ten_buildings",
      name: "Architect",
      detail: "Own 10 building levels",
      unlocked: state.buildings.reduce((s, b) => s + b.level, 0) >= 10,
      icon: "construct" as const,
    },
    {
      id: "lv_five",
      name: "Rising Hero",
      detail: "Reach character level 5",
      unlocked: state.character_level >= 5,
      icon: "ribbon" as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatarGlow}>
            <Image
              source={{ uri: user?.picture || ASSETS.avatar }}
              style={styles.avatar}
              testID="profile-avatar"
            />
          </View>
          <Text style={styles.name} testID="profile-name">
            {user?.name ?? "Hero"}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.levelRibbon}>
            <Ionicons name="flame" size={14} color={colors.secondary} />
            <Text style={styles.levelText}>Commander Level {state.character_level}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatBox
            icon="shield"
            label="Power Level"
            value={formatKi(state.power_level)}
            tone={colors.primary}
            testID="profile-stat-power"
          />
          <StatBox
            icon="infinite"
            label="Total Ki"
            value={formatKi(state.total_ki_earned)}
            tone={colors.secondary}
            testID="profile-stat-totalki"
          />
          <StatBox
            icon="hand-left"
            label="Total Taps"
            value={formatKi(state.tap_count)}
            tone={colors.deepPurple}
            testID="profile-stat-taps"
          />
          <StatBox
            icon="trending-up"
            label="Ki / Sec"
            value={formatRate(state.ki_per_sec)}
            tone={colors.success}
            testID="profile-stat-cps"
          />
        </View>

        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementGrid}>
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[styles.achievement, a.unlocked && styles.achievementUnlocked]}
            >
              <Ionicons
                name={a.icon}
                size={20}
                color={a.unlocked ? colors.secondary : colors.textDisabled}
              />
              <Text
                style={[
                  styles.achievementName,
                  a.unlocked && { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {a.name}
              </Text>
              <Text style={styles.achievementDetail} numberOfLines={2}>
                {a.detail}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          testID="profile-logout-button"
        >
          <Ionicons name="log-out" size={18} color={colors.powerRed} />
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </Pressable>

        <Text style={styles.version}>v1.0 • Phase 1 MVP</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  icon,
  label,
  value,
  tone,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: string;
  testID?: string;
}) {
  return (
    <View style={[styles.statBox, { borderLeftColor: tone }]} testID={testID}>
      <Ionicons name={icon} size={16} color={tone} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  scroll: { padding: spacing.lg, gap: spacing.md },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  avatarGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 4,
    backgroundColor: "rgba(0,240,255,0.15)",
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 60 },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  email: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  levelRibbon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,184,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.4)",
  },
  levelText: {
    color: colors.secondary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statBox: {
    width: "48%",
    backgroundColor: colors.panel,
    borderLeftWidth: 4,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  statValue: { color: colors.textPrimary, fontSize: 20, fontWeight: "900" },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: spacing.md,
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  achievement: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 4,
    opacity: 0.55,
  },
  achievementUnlocked: {
    opacity: 1,
    borderColor: colors.secondary,
    backgroundColor: "rgba(255,184,0,0.1)",
  },
  achievementName: {
    color: colors.textDisabled,
    fontWeight: "800",
    fontSize: 13,
  },
  achievementDetail: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,0,60,0.4)",
    backgroundColor: "rgba(255,0,60,0.1)",
  },
  logoutText: {
    color: colors.powerRed,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 13,
  },
  version: {
    color: colors.textDisabled,
    fontSize: 10,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
