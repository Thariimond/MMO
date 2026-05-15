// Reusable stat pill: label on top, big value below.
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/src/theme";

type Props = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "secondary" | "neutral";
  testID?: string;
};

export default function StatPill({ label, value, icon, tone = "neutral", testID }: Props) {
  const accent =
    tone === "primary" ? colors.primary : tone === "secondary" ? colors.secondary : colors.textPrimary;
  return (
    <View style={styles.pill} testID={testID}>
      <View style={styles.header}>
        {icon ? <Ionicons name={icon} size={12} color={accent} /> : null}
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
});
