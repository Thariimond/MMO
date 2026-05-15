// Alliance/Guild placeholder for Phase 2.
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/src/theme";

const FEATURES = [
  { icon: "shield-checkmark" as const, name: "Form an Alliance", detail: "Create or join a guild" },
  { icon: "chatbubbles" as const, name: "Alliance Chat", detail: "Real-time strategy talk" },
  { icon: "skull" as const, name: "Cosmic Raid Bosses", detail: "Co-op fights for huge loot" },
  { icon: "ribbon" as const, name: "Alliance Perks", detail: "Multipliers for all members" },
];

export default function AllianceScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="alliance-screen">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMING SOON</Text>
        <Text style={styles.title}>Alliances</Text>
        <Text style={styles.subtitle}>
          Squad up with fellow heroes to crush galactic threats.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {FEATURES.map((f) => (
          <View key={f.name} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{f.name}</Text>
              <Text style={styles.rowDetail}>{f.detail}</Text>
            </View>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={11} color={colors.textDisabled} />
              <Text style={styles.lockText}>SOON</Text>
            </View>
          </View>
        ))}

        <View style={styles.cta}>
          <Ionicons name="rocket" size={20} color={colors.secondary} />
          <Text style={styles.ctaTitle}>Phase 2 Update</Text>
          <Text style={styles.ctaText}>
            Keep tapping & leveling up — alliances arrive in the next patch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  eyebrow: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,240,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,240,255,0.3)",
  },
  rowName: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  rowDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  lockText: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cta: {
    marginTop: spacing.md,
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(255,184,0,0.1)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.3)",
    gap: 6,
  },
  ctaTitle: {
    color: colors.secondary,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1.5,
  },
  ctaText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
});
