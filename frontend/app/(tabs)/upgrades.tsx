// Upgrades screen: list of buildings with buy buttons.
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
import { useGameState } from "@/src/hooks/useGameState";
import { colors, radii, spacing, BUILDING_IMAGES } from "@/src/theme";
import { formatKi, formatRate } from "@/src/utils/format";

const BUILDING_META: Record<string, { name: string; description: string; emoji: string }> = {
  training_dojo: {
    name: "Training Dojo",
    description: "Disciples train and channel ki for you.",
    emoji: "🥋",
  },
  spirit_generator: {
    name: "Spirit Bomb Generator",
    description: "Condenses ambient energy into raw ki.",
    emoji: "💫",
  },
  crystal_mine: {
    name: "Ki Crystal Mine",
    description: "Automated drills extract crystalized ki.",
    emoji: "💎",
  },
  energy_reactor: {
    name: "Fusion Energy Reactor",
    description: "Anime-grade reactors produce massive output.",
    emoji: "⚛️",
  },
  power_temple: {
    name: "Power Temple",
    description: "Ancient temple channels divine ki to your empire.",
    emoji: "⛩️",
  },
};

export default function UpgradesScreen() {
  const { state, loading, buy } = useGameState();

  if (loading || !state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="upgrades-screen">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EMPIRE</Text>
        <Text style={styles.title}>Build Your Arsenal</Text>
        <View style={styles.kiRow}>
          <Ionicons name="flash" color={colors.primary} size={16} />
          <Text style={styles.kiValue} testID="upgrades-ki-balance">
            {formatKi(state.ki)} ki
          </Text>
          <Text style={styles.kiRate}>• {formatRate(state.ki_per_sec)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {state.buildings.map((b) => {
          const meta = BUILDING_META[b.id] ?? { name: b.id, description: "", emoji: "✨" };
          const canAfford = state.ki >= b.next_cost;
          return (
            <View key={b.id} style={styles.card} testID={`upgrade-card-${b.id}`}>
              <View style={styles.cardLeft}>
                {BUILDING_IMAGES[b.id] ? (
                  <Image source={{ uri: BUILDING_IMAGES[b.id] }} style={styles.thumb} />
                ) : (
                  <Text style={styles.emoji}>{meta.emoji}</Text>
                )}
                <View style={styles.levelChip}>
                  <Text style={styles.levelChipText}>LV {b.level}</Text>
                </View>
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.cardTitle}>{meta.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {meta.description}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>
                    <Ionicons name="trending-up" size={11} color={colors.success} />{" "}
                    {b.level > 0 ? formatRate(b.cps) : "Not built"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => void buy(b.id, 1)}
                disabled={!canAfford}
                style={({ pressed }) => [
                  styles.buyBtn,
                  !canAfford && styles.buyBtnDisabled,
                  pressed && canAfford && styles.buyBtnPressed,
                ]}
                testID={`upgrade-item-${b.id}-buy-button`}
              >
                <Text
                  style={[
                    styles.buyBtnLabel,
                    !canAfford && styles.buyBtnLabelDisabled,
                  ]}
                >
                  {b.level === 0 ? "BUILD" : "UPGRADE"}
                </Text>
                <Text
                  style={[
                    styles.buyBtnCost,
                    !canAfford && styles.buyBtnLabelDisabled,
                  ]}
                >
                  {formatKi(b.next_cost)} ki
                </Text>
              </Pressable>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  eyebrow: {
    color: colors.primary,
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
  kiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  kiValue: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  kiRate: { color: colors.textSecondary, fontSize: 12 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    overflow: "hidden",
    alignItems: "stretch",
  },
  cardLeft: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.md, resizeMode: "cover" },
  emoji: { fontSize: 36 },
  levelChip: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
  },
  levelChipText: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cardMid: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 15,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  metaRow: { marginTop: spacing.xs },
  metaItem: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  buyBtn: {
    width: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepPurple,
    borderLeftWidth: 1,
    borderLeftColor: colors.neonMagenta,
  },
  buyBtnDisabled: {
    backgroundColor: colors.surface,
  },
  buyBtnPressed: {
    opacity: 0.85,
  },
  buyBtnLabel: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  buyBtnCost: {
    color: colors.secondary,
    fontWeight: "800",
    fontSize: 11,
    marginTop: 2,
  },
  buyBtnLabelDisabled: { color: colors.textDisabled },
});
