import React from 'react';
import { LayoutChangeEvent, StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface MarqueeTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export default function MarqueeText({ text, style }: MarqueeTextProps) {
  const translateX = useSharedValue(0);
  const textWidthRef = React.useRef(0);
  const containerWidthRef = React.useRef(0);
  const [measured, setMeasured] = React.useState(false);

  const startAnimation = React.useCallback(() => {
    const tw = textWidthRef.current;
    const cw = containerWidthRef.current;
    if (tw <= cw || cw === 0) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }
    const overflow = tw - cw;
    translateX.value = 0;
    translateX.value = withRepeat(
      withSequence(
        withDelay(1500, withTiming(-overflow, { duration: overflow * 25, easing: Easing.linear })),
        withDelay(1500, withTiming(0, { duration: overflow * 25, easing: Easing.linear })),
      ),
      -1,
    );
  }, []);

  const onContainerLayout = React.useCallback((e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width;
    if (measured) startAnimation();
  }, [measured, startAnimation]);

  const onTextLayout = React.useCallback((e: LayoutChangeEvent) => {
    textWidthRef.current = e.nativeEvent.layout.width;
    setMeasured(true);
    startAnimation();
  }, [startAnimation]);

  // Restart animation when text changes
  React.useEffect(() => {
    if (measured) startAnimation();
  }, [text, measured, startAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ overflow: 'hidden' }} onLayout={onContainerLayout}>
      {/* Off-screen measurement text — positioned far left so it's not clipped */}
      <View style={{ position: 'absolute', top: -9999, left: 0, right: undefined, flexDirection: 'row' }}>
        <Text style={style} onLayout={onTextLayout}>{text}</Text>
      </View>
      {/* Visible scrolling text */}
      <Animated.View style={[{ flexDirection: 'row' }, animatedStyle]}>
        <Text style={style}>{text}</Text>
      </Animated.View>
    </View>
  );
}
