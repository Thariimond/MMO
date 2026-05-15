// Main game screen: tap the ki orb, see stats, level progress.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  GestureResponderEvent,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useGameState } from "@/src/hooks/useGameState";
import FloatingNumber from "@/src/components/FloatingNumber";
import StatPill from "@/src/components/StatPill";
import { ASSETS, colors, radii, spacing } from "@/src/theme";
import { formatKi, formatRate, formatSeconds } from "@/src/utils/format";

type FloatItem = { id: number; x: number; y: number; amount: string };

export default function HomeScreen() {
  const { state, loading, tap } = useGameState();
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [showIdle, setShowIdle] = useState(false);
  const floatIdRef = useRef(0);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glow]);

  // Show idle gain banner once on initial load
  useEffect(() => {
    if (state && state.idle_gain > 1) {
      setShowIdle(true);
      const t = setTimeout(() => setShowIdle(false), 5000);
      return () => clearTimeout(t);
    }
  }, [state?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.95 + glow.value * 0.1 }],
  }));

  const removeFloat = useCallback((id: number) => {
    setFloats((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const onTap = useCallback(
    (event: GestureResponderEvent) => {
      if (!state) return;
      const id = ++floatIdRef.current;
      const { locationX = 80, locationY = 80 } = event.nativeEvent;
      setFloats((prev) => [
        ...prev.slice(-9),
        { id, x: locationX, y: locationY, amount: formatKi(state.tap_power) },
      ]);
      scale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) }),
      );
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      tap();
    },
    [state, scale, tap],
  );

  if (loading || !state) {
    return (
      <View style={styles.loading} testID="home-loading">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Level progress (current_level XP -> next_level XP)
  const prevLevelXp = state.character_level <= 1 ? 0 : Math.floor(state.next_level_xp / 1.5);
  const denom = Math.max(1, state.next_level_xp - prevLevelXp);
  const progressed = Math.max(0, state.total_ki_earned - prevLevelXp);
  const pct = Math.max(0, Math.min(1, progressed / denom));

  return (
    <View style={styles.container} testID="home-screen">
      <ImageBackground
        source={{ uri: ASSETS.background }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(10,11,16,0.55)", "rgba(10,11,16,0.85)", "rgba(10,11,16,1)"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Top HUD */}
        <View style={styles.hud}>
          <View style={styles.hudTopRow}>
            <View style={styles.levelBadge} testID="hud-character-level">
              <Ionicons name="flame" size={14} color={colors.secondary} />
              <Text style={styles.levelText}>LV {state.character_level}</Text>
            </View>
            <View style={styles.powerBadge}>
              <Ionicons name="shield" size={12} color={colors.primary} />
              <Text style={styles.powerText}>PWR {formatKi(state.power_level)}</Text>
            </View>
          </View>

          <Text style={styles.kiValue} testID="hud-total-energy">
            {formatKi(state.ki)} <Text style={styles.kiUnit}>ki</Text>
          </Text>
          <Text style={styles.kiRate} testID="hud-energy-per-sec">
            ⚡ {formatRate(state.ki_per_sec)} • Tap = {formatKi(state.tap_power)}
          </Text>

          {/* Level progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {formatKi(progressed)} / {formatKi(denom)} to LV {state.character_level + 1}
          </Text>
        </View>

        {/* Idle banner */}
        {showIdle ? (
          <View style={styles.idleBanner} testID="idle-banner">
            <Ionicons name="moon" size={16} color={colors.secondary} />
            <Text style={styles.idleText}>
              While you were away ({formatSeconds(state.idle_seconds)}) you earned{" "}
              <Text style={styles.idleGain}>+{formatKi(state.idle_gain)} ki</Text>
            </Text>
          </View>
        ) : null}

        {/* Orb */}
        <View style={styles.orbWrap}>
          <Animated.View style={[styles.orbGlow, glowAnimStyle]} pointerEvents="none" />
          <Pressable
            onPress={onTap}
            style={styles.orbPressable}
            testID="game-tappable-orb"
          >
            <Animated.View style={[styles.orbInner, orbAnimStyle]}>
              <Image source={{ uri: ASSETS.orb }} style={styles.orbImage} />
            </Animated.View>
            {floats.map((f) => (
              <FloatingNumber
                key={f.id}
                id={f.id}
                x={f.x}
                y={f.y}
                amount={f.amount}
                onDone={removeFloat}
              />
            ))}
          </Pressable>
          <Text style={styles.tapHint}>TAP TO CHANNEL KI</Text>
        </View>

        {/* Bottom stat pills */}
        <View style={styles.statsRow}>
          <StatPill
            icon="hand-left"
            label="Total Taps"
            value={formatKi(state.tap_count)}
            tone="primary"
            testID="stat-total-taps"
          />
          <StatPill
            icon="infinite"
            label="Total Ki"
            value={formatKi(state.total_ki_earned)}
            tone="secondary"
            testID="stat-total-ki"
          />
        </View>
      </SafeAreaView>
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
  safe: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 76 },
  hud: {
    paddingTop: spacing.sm,
  },
  hudTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,184,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.35)",
  },
  levelText: {
    color: colors.secondary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  powerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: "rgba(0,240,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,240,255,0.35)",
  },
  powerText: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  kiValue: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginTop: spacing.md,
    textShadowColor: colors.primaryGlow,
    textShadowRadius: 12,
  },
  kiUnit: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  kiRate: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  progressLabel: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.6,
  },
  idleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(138,43,226,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,0,255,0.4)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  idleText: { color: colors.textPrimary, fontSize: 12, flex: 1 },
  idleGain: { color: colors.secondary, fontWeight: "900" },
  orbWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  orbGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.primaryGlow,
    opacity: 0.6,
  },
  orbPressable: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  orbInner: { width: "100%", height: "100%" },
  orbImage: { width: "100%", height: "100%", resizeMode: "contain" },
  tapHint: {
    color: colors.primary,
    letterSpacing: 4,
    fontSize: 11,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
