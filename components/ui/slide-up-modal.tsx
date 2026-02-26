import React, { createContext, useEffect, useState } from 'react';
import { Dimensions, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_SNAP_POINTS = {
  MIN: SCREEN_HEIGHT * 0.35,
  HALF: SCREEN_HEIGHT * 0.5,
  MAX: SCREEN_HEIGHT * 0.95,
};

/** Imperative handle exposed by SlideUpModal via ref */
export interface SlideUpModalHandle {
  snapToPoint: (point: 'min' | 'half' | 'max') => void;
  dismiss: (fast?: boolean) => void;
  slideIn: (targetSnap?: 'min' | 'half' | 'max') => void;
}

export const SlideUpModalContext = createContext<{
  isFullscreen: boolean;
  isCollapsed: boolean;
  scrollOffset: SharedValue<number>;
  panGesture: ReturnType<typeof Gesture.Pan> | null;
  modalHeight: SharedValue<number>;
  contentOpacity: SharedValue<number>;
  snapToPoint?: (point: 'min' | 'half' | 'max') => void;
  setGestureEnabled?: (enabled: boolean) => void;
}>({
  isFullscreen: false,
  isCollapsed: false,
  scrollOffset: { value: 0 } as SharedValue<number>,
  panGesture: null,
  modalHeight: { value: DEFAULT_SNAP_POINTS.HALF } as SharedValue<number>,
  contentOpacity: { value: 1 } as SharedValue<number>,
});

interface SlideUpModalProps {
  children: React.ReactNode;
  onSnapChange?: (snapPoint: 'min' | 'half' | 'max') => void;
  onHeightChange?: (height: number) => void;
  onDismiss?: () => void;
  /** Custom minimum snap point as percentage (e.g., 0.25 for 25%). Defaults to 0.35 */
  minSnapPercent?: number;
  /** Initial snap point. Defaults to 'half' */
  initialSnap?: 'min' | 'half' | 'max';
  /** When true, mount off-screen without auto-sliding in. Use slideIn() to show. */
  startHidden?: boolean;
}

export default React.forwardRef<SlideUpModalHandle, SlideUpModalProps>(function SlideUpModal(
  { children, onSnapChange, onHeightChange, onDismiss, minSnapPercent = 0.35, initialSnap = 'half', startHidden = false }: SlideUpModalProps,
  ref: React.Ref<SlideUpModalHandle>
) {
  // Get safe area insets dynamically
  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const safeAreaBottomInset = screenHeight - windowHeight;
  // Get status bar height to extend modal to true top of screen
  const statusBarHeight = StatusBar.currentHeight || 0;

  // Calculate snap points with customizable min
  const SNAP_POINTS = React.useMemo(
    () => ({
      MIN: SCREEN_HEIGHT * minSnapPercent,
      HALF: DEFAULT_SNAP_POINTS.HALF,
      MAX: DEFAULT_SNAP_POINTS.MAX,
    }),
    [minSnapPercent]
  );

  const getInitialHeight = () => {
    if (initialSnap === 'min') return SNAP_POINTS.MIN;
    if (initialSnap === 'max') return SNAP_POINTS.MAX;
    return SNAP_POINTS.HALF;
  };

  // Start off-screen (at bottom)
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const context = useSharedValue({ y: 0 });
  const currentSnap = useSharedValue<'min' | 'half' | 'max'>(initialSnap);
  const scrollOffset = useSharedValue(0);
  const modalHeight = useSharedValue(getInitialHeight());
  const [isFullscreen, setIsFullscreen] = useState(initialSnap === 'max');
  const [isCollapsed, setIsCollapsed] = useState(initialSnap === 'min');
  const [gestureEnabled, setGestureEnabled] = useState(true);

  // Content opacity - fades elements between HALF (50%) and MIN (collapsed) height
  // At HALF height: opacity = 1 (fully visible)
  // At MIN height: opacity = 0 (hidden)
  const contentOpacity = useDerivedValue(() => {
    const currentHeight = SCREEN_HEIGHT - translateY.value;
    const minHeight = SNAP_POINTS.MIN;
    const halfHeight = SNAP_POINTS.HALF;

    // Clamp and interpolate
    return interpolate(currentHeight, [minHeight, halfHeight], [0, 1], 'clamp');
  });

  // Dismiss function to animate out and call onDismiss
  // When fast=true, uses a quick timing animation for snappy modal-to-modal transitions
  const dismiss = (fast?: boolean) => {
    if (fast) {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 150, easing: Easing.out(Easing.quad) },
        finished => {
          if (finished && onDismiss) {
            runOnJS(onDismiss)();
          }
        }
      );
    } else {
      translateY.value = withSpring(
        SCREEN_HEIGHT,
        {
          damping: 60,
          stiffness: 500,
        },
        finished => {
          if (finished && onDismiss) {
            runOnJS(onDismiss)();
          }
        }
      );
    }
  };

  // Slide in function to animate modal back into view
  const slideIn = (targetSnap: 'min' | 'half' | 'max' = 'half') => {
    const snapPoint =
      targetSnap === 'min' ? SNAP_POINTS.MIN : targetSnap === 'half' ? SNAP_POINTS.HALF : SNAP_POINTS.MAX;
    const targetY = SCREEN_HEIGHT - snapPoint;

    currentSnap.value = targetSnap;
    modalHeight.value = snapPoint;

    runOnJS(setIsFullscreen)(targetSnap === 'max');
    runOnJS(setIsCollapsed)(targetSnap === 'min');

    translateY.value = withSpring(targetY, {
      damping: 60,
      stiffness: 500,
    });
  };

  React.useImperativeHandle(
    ref,
    () => ({
      snapToPoint,
      dismiss,
      slideIn,
    }),
    []
  );

  useEffect(() => {
    if (startHidden) return; // Stay off-screen, wait for explicit slideIn()
    // Animate in on mount from bottom of screen
    translateY.value = withSpring(SCREEN_HEIGHT - getInitialHeight(), {
      damping: 60,
      stiffness: 500,
    });
  }, []);

  const snapToPoint = (point: 'min' | 'half' | 'max') => {
    const snapPoint = point === 'min' ? SNAP_POINTS.MIN : point === 'half' ? SNAP_POINTS.HALF : SNAP_POINTS.MAX;
    const targetY = SCREEN_HEIGHT - snapPoint;

    currentSnap.value = point;
    modalHeight.value = snapPoint;

    if (onSnapChange) {
      runOnJS(onSnapChange)(point);
    }

    if (onHeightChange) {
      runOnJS(onHeightChange)(snapPoint);
    }

    runOnJS(setIsFullscreen)(point === 'max');
    runOnJS(setIsCollapsed)(point === 'min');

    translateY.value = withSpring(targetY, {
      damping: 60,
      stiffness: 500,
    });
  };

  const panGesture = Gesture.Pan()
    .enableTrackpadTwoFingerGesture(true)
    .maxPointers(1)
    .enabled(gestureEnabled)
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate(event => {
      // At fullscreen, only handle downward gesture if scrolled to top
      // This allows upward scrolling in the content
      if (currentSnap.value === 'max') {
        // If scrolled down in content, don't intercept any gestures
        if (scrollOffset.value > 0) {
          return;
        }
        // If at top but swiping up (trying to scroll content), don't intercept
        if (event.translationY < 0) {
          return;
        }
      }

      // Update position within bounds
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(SCREEN_HEIGHT - SNAP_POINTS.MAX, Math.min(SCREEN_HEIGHT - SNAP_POINTS.MIN, newY));
    })
    .onEnd(event => {
      const velocity = event.velocityY;
      const currentY = translateY.value;
      const currentHeight = SCREEN_HEIGHT - currentY;

      // Quick swipe detection (velocity-based)
      const QUICK_SWIPE_VELOCITY = 1000;
      const isQuickSwipeUp = velocity < -QUICK_SWIPE_VELOCITY;
      const isQuickSwipeDown = velocity > QUICK_SWIPE_VELOCITY;

      let targetSnap: 'min' | 'half' | 'max';

      if (isQuickSwipeUp) {
        // Quick swipe up -> fullscreen
        targetSnap = 'max';
      } else if (isQuickSwipeDown) {
        // Quick swipe down -> collapse
        targetSnap = 'min';
      } else {
        // Careful/slow swipe -> snap to closest
        const distances = [
          { point: SNAP_POINTS.MIN, distance: Math.abs(currentHeight - SNAP_POINTS.MIN), key: 'min' as const },
          { point: SNAP_POINTS.HALF, distance: Math.abs(currentHeight - SNAP_POINTS.HALF), key: 'half' as const },
          { point: SNAP_POINTS.MAX, distance: Math.abs(currentHeight - SNAP_POINTS.MAX), key: 'max' as const },
        ];

        const closest = distances.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev));

        targetSnap = closest.key;
      }

      // Apply the snap
      const targetHeight = SNAP_POINTS[targetSnap.toUpperCase() as 'MIN' | 'HALF' | 'MAX'];
      const targetY = SCREEN_HEIGHT - targetHeight;

      currentSnap.value = targetSnap;
      modalHeight.value = targetHeight;

      runOnJS(setIsFullscreen)(targetSnap === 'max');
      runOnJS(setIsCollapsed)(targetSnap === 'min');

      if (onSnapChange) {
        runOnJS(onSnapChange)(targetSnap);
      }

      if (onHeightChange) {
        runOnJS(onHeightChange)(targetHeight);
      }

      translateY.value = withSpring(targetY, {
        damping: 60,
        stiffness: 500,
      });
    })
    .simultaneousWithExternalGesture();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBorderRadius = useAnimatedStyle(() => {
    // Keep border radius constant at BorderRadius.xl (32)
    return {
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
    };
  });

  const animatedBackground = useAnimatedStyle(() => {
    // Calculate current height of modal
    const currentHeight = SCREEN_HEIGHT - translateY.value;

    // Progress from HALF (50%) to MAX (95%)
    const halfHeight = SNAP_POINTS.HALF;
    const maxHeight = SNAP_POINTS.MAX;

    // Calculate interpolation progress (0 at 50%, 1 at 95%)
    const progress = Math.max(0, Math.min(1, (currentHeight - halfHeight) / (maxHeight - halfHeight)));

    // Interpolate border opacity (fade out at fullscreen)
    const borderOpacity = 1 - progress;

    return {
      borderColor: borderOpacity > 0.01 ? AppColors.border.primary : 'transparent',
      borderWidth: 1,
    };
  });

  const animatedMargins = useAnimatedStyle(() => {
    // Calculate current height of modal
    const currentHeight = SCREEN_HEIGHT - translateY.value;

    // Progress from HALF (50%) to MAX (95%)
    const halfHeight = SNAP_POINTS.HALF;
    const maxHeight = SNAP_POINTS.MAX;

    // Calculate interpolation progress (0 at 50%, 1 at 95%)
    const progress = Math.max(0, Math.min(1, (currentHeight - halfHeight) / (maxHeight - halfHeight)));

    // Interpolate horizontal margins from 10px to 0px
    // At 35% and 50%: 10px margins
    // At 95%: 0px margins
    const horizontalMargin = 10 * (1 - progress);

    // Add 15px top margin at fullscreen (95%)
    const topMargin = 15 * progress;

    return {
      marginLeft: horizontalMargin,
      marginRight: horizontalMargin,
      marginTop: topMargin,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <SlideUpModalContext.Provider
          value={{
            isFullscreen,
            isCollapsed,
            scrollOffset,
            panGesture,
            modalHeight,
            contentOpacity,
            snapToPoint,
            setGestureEnabled,
          }}
        >
          <Animated.View
            style={[
              styles.blurContainer,
              animatedBorderRadius,
              animatedBackground,
              animatedMargins,
              isFullscreen && styles.blurContainerFullscreen,
            ]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, animatedBorderRadius, { overflow: 'hidden', backgroundColor: AppColors.background.primary }]}>
              <Animated.View style={styles.content}>
                <View style={styles.handleContainer} />
                <View style={styles.childrenContainer}>{children}</View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </SlideUpModalContext.Provider>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 1000,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
    // backgroundColor and borderColor are now animated
    borderBottomWidth: 0,
    shadowColor: AppColors.shadow,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  blurContainerFullscreen: {
    borderWidth: 0,
    borderBottomWidth: 0,
    shadowOpacity: 0,
  },

  content: {
    flex: 1,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#71717A',
  },
  childrenContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
});
