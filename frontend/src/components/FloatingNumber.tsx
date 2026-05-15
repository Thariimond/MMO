// Animated +N text bubble that floats up and fades on tap.
import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { colors } from "@/src/theme";

type Props = {
  id: number;
  x: number;
  y: number;
  amount: string;
  onDone: (id: number) => void;
};

export default function FloatingNumber({ id, x, y, amount, onDone }: Props) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.7);

  React.useEffect(() => {
    scale.value = withTiming(1.1, { duration: 120, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(-90, { duration: 850, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(
      0,
      { duration: 850, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDone)(id);
      },
    );
  }, [id, onDone, opacity, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrap, { left: x - 30, top: y - 20 }, style]} pointerEvents="none">
      <Text style={styles.text}>+{amount}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", width: 60, alignItems: "center" },
  text: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: colors.secondaryGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
});
