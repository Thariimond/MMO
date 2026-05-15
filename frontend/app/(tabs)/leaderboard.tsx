// Global leaderboard screen.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth/AuthContext";
import { gameApi, LeaderEntry, LeaderboardDTO } from "@/src/api/game";
import { ASSETS, colors, radii, spacing } from "@/src/theme";
import { formatKi } from "@/src/utils/format";

const PODIUM_COLORS = [colors.secondary, "#C0C5CE", "#CD7F32"];

export default function LeaderboardScreen() {
  const { token, user } = useAuth();
  const [data, setData] = useState<LeaderboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await gameApi.leaderboard(token);
      setData(res);
    } catch (e) {
      console.warn("leaderboard load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const top = data?.top ?? [];
  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="leaderboard-screen">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>HALL OF LEGENDS</Text>
        <Text style={styles.title}>Galactic Rankings</Text>
        <Text style={styles.subtitle}>{data?.total_players ?? 0} heroes battling for glory</Text>
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            {podium.length > 0 ? (
              <View style={styles.podium}>
                {podium.map((entry, idx) => (
                  <PodiumCard
                    key={entry.user_id}
                    entry={entry}
                    rank={idx + 1}
                    isMe={entry.user_id === user?.user_id}
                  />
                ))}
              </View>
            ) : null}
            {rest.length > 0 ? (
              <Text style={styles.sectionLabel}>OTHER COMMANDERS</Text>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <LeaderRow entry={item} isMe={item.user_id === user?.user_id} />
        )}
        ListEmptyComponent={() =>
          podium.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trophy" size={36} color={colors.textDisabled} />
              <Text style={styles.emptyText}>No heroes yet. Be the first!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={() => <View style={{ height: 100 }} />}
      />

      {data?.me && data.me.rank > 3 ? (
        <View style={styles.meBar} testID="leaderboard-me-bar">
          <LeaderRow entry={data.me} isMe pinned />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function PodiumCard({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderEntry;
  rank: number;
  isMe: boolean;
}) {
  const accent = PODIUM_COLORS[rank - 1] ?? colors.primary;
  return (
    <View
      style={[
        styles.podiumCard,
        { borderColor: accent },
        rank === 1 && styles.podiumCardWinner,
        isMe && { backgroundColor: "rgba(0,240,255,0.08)" },
      ]}
      testID={`leaderboard-rank-${rank}`}
    >
      <View style={[styles.medal, { backgroundColor: accent }]}>
        <Text style={styles.medalText}>{rank}</Text>
      </View>
      <Image source={{ uri: entry.picture || ASSETS.avatar }} style={styles.podiumAvatar} />
      <Text style={styles.podiumName} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.podiumPower}>{formatKi(entry.power_level)}</Text>
      <Text style={styles.podiumLabel}>POWER LV</Text>
    </View>
  );
}

function LeaderRow({
  entry,
  isMe,
  pinned,
}: {
  entry: LeaderEntry;
  isMe: boolean;
  pinned?: boolean;
}) {
  return (
    <View
      style={[styles.row, isMe && styles.rowMe, pinned && styles.rowPinned]}
      testID={`leaderboard-row-${entry.user_id}`}
    >
      <Text style={[styles.rank, isMe && { color: colors.primary }]}>#{entry.rank}</Text>
      <Image source={{ uri: entry.picture || ASSETS.avatar }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name} {isMe ? <Text style={styles.you}>(you)</Text> : null}
        </Text>
        <Text style={styles.subline}>LV {entry.character_level} • {formatKi(entry.total_ki_earned)} ki</Text>
      </View>
      <View style={styles.powerCol}>
        <Text style={styles.powerVal}>{formatKi(entry.power_level)}</Text>
        <Text style={styles.powerLabel}>PWR</Text>
      </View>
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
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  list: { padding: spacing.lg, gap: spacing.sm },
  podium: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 2,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    gap: 4,
  },
  podiumCardWinner: { paddingVertical: spacing.lg },
  medal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: { color: colors.bg, fontWeight: "900", fontSize: 13 },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: 4,
    borderWidth: 2,
    borderColor: colors.borderDefault,
  },
  podiumName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  podiumPower: { color: colors.primary, fontWeight: "900", fontSize: 14 },
  podiumLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowMe: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0,240,255,0.08)",
  },
  rowPinned: { borderColor: colors.primary, borderWidth: 1.5 },
  rank: {
    color: colors.textSecondary,
    fontWeight: "900",
    fontSize: 14,
    width: 38,
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  name: { color: colors.textPrimary, fontWeight: "800", fontSize: 13 },
  you: { color: colors.primary, fontWeight: "800" },
  subline: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  powerCol: { alignItems: "flex-end" },
  powerVal: { color: colors.primary, fontWeight: "900", fontSize: 14 },
  powerLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 10,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  meBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 80,
  },
});
