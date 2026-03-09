import { createLiveActivity, type LiveActivityLayout } from 'expo-widgets';
import { Text, VStack, HStack, Spacer, Image } from '@expo/ui/swift-ui';
import { foregroundStyle, font, padding, frame, background, clipShape, textCase } from '@expo/ui/swift-ui/modifiers';

export interface TrainActivityProps {
  trainNumber: string;
  routeName: string;
  fromCode: string;
  toCode: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  delayMinutes: number;
  minutesRemaining: number;
  status: string;
  lastUpdated: number;
}

function delayColor(delay: number): string {
  return delay > 0 ? '#EF4444' : '#22C55E';
}

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Arrived';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function statusLabel(delay: number): string {
  if (delay > 0) {
    const h = Math.floor(delay / 60);
    const m = delay % 60;
    if (h > 0 && m > 0) return `Delayed ${h}h${m}m`;
    if (h > 0) return `Delayed ${h}h`;
    return `Delayed ${m}m`;
  }
  if (delay < 0) return `${-delay}m early`;
  return 'On Time';
}

function TrainLiveActivityLayout(props?: TrainActivityProps): LiveActivityLayout {
  'widget';

  const captionBold = font({ size: 12, weight: 'bold' });
  const caption2 = font({ size: 11 });
  const caption2Bold = font({ size: 11, weight: 'bold' });

  const delay = props?.delayMinutes ?? 0;
  const color = delayColor(delay);
  const timeRemaining = formatTimeRemaining(props?.minutesRemaining ?? 0);
  const toCode = props?.toCode ?? '';

  const delayLabel = delay > 0
    ? `${delay}m late`
    : delay < 0
      ? `${-delay}m early`
      : 'On time';

  return {
    // Lock Screen / Notification Center banner
    banner: (
      <VStack spacing={0} modifiers={[padding({ all: 16 })]}>
        {/* Header: train id left, app name right */}
        <HStack modifiers={[padding({ bottom: 10 })]}>
          <HStack spacing={7}>
            <Image
              systemName="tram.fill"
              size={12}
              color="#FFFFFF"
              modifiers={[padding({ all: 5 }), background(color), clipShape('circle')]}
            />
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
              Train {props?.trainNumber}
            </Text>
          </HStack>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF60')]}>Tracky</Text>
        </HStack>

        {/* Route row: FROM time ... tram ... time TO */}
        <HStack>
          <VStack alignment="leading" spacing={3}>
            <HStack spacing={6}>
              <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props?.fromCode}</Text>
              <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle(color)]}>{props?.departTime}</Text>
            </HStack>
            {delay !== 0 && (
              <Text modifiers={[font({ size: 12 }), foregroundStyle(color)]}>{delayLabel}</Text>
            )}
          </VStack>

          <Spacer />
          <Image systemName="tram.fill" size={15} color="#FFFFFF50" />
          <Spacer />

          <VStack alignment="trailing" spacing={3}>
            <HStack spacing={6}>
              <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle(color)]}>{props?.arriveTime}</Text>
              <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props?.toCode}</Text>
            </HStack>
            {delay !== 0 && (
              <Text modifiers={[font({ size: 12 }), foregroundStyle(color)]}>{delayLabel}</Text>
            )}
          </VStack>
        </HStack>

        {/* Progress line */}
        <HStack modifiers={[frame({ height: 2 }), background(color), clipShape('capsule'), padding({ vertical: 14 })]}>
          <Spacer />
        </HStack>

        {/* Time remaining */}
        <VStack alignment="center" spacing={4}>
          <Text modifiers={[font({ size: 26, weight: 'bold', design: 'rounded' }), foregroundStyle(color)]}>
            {timeRemaining}
          </Text>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#FFFFFF60'), textCase('uppercase')]}>
            Until arrival
          </Text>
        </VStack>
      </VStack>
    ),

    // Dynamic Island compact: leading = colored circle + time remaining
    compactLeading: (
      <HStack spacing={4}>
        <Image
          systemName="arrow.up.right"
          size={10}
          color="#000000"
          modifiers={[padding({ all: 4 }), background(color), clipShape('circle')]}
        />
        <Text modifiers={[caption2Bold, foregroundStyle(color)]}>{timeRemaining}</Text>
      </HStack>
    ),

    // Dynamic Island compact: trailing = station pill
    compactTrailing: (
      <HStack spacing={4} modifiers={[padding({ horizontal: 6, vertical: 3 }), background(color), clipShape('capsule')]}>
        <Image systemName="tram.fill" size={9} color="#000000" />
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle('#000000')]}>{toCode}</Text>
      </HStack>
    ),

    // Dynamic Island minimal: tram icon
    minimal: <Image systemName="tram.fill" size={12} color={color} />,

    // Dynamic Island expanded: leading
    expandedLeading: (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 17, weight: 'bold' })]}>{props?.fromCode}</Text>
        <Text modifiers={[caption2, foregroundStyle('secondary')]}>{props?.departTime}</Text>
      </VStack>
    ),

    // Dynamic Island expanded: center
    expandedCenter: (
      <VStack spacing={2}>
        <Text modifiers={[captionBold]}>Train {props?.trainNumber}</Text>
        <Text modifiers={[caption2, foregroundStyle(color)]}>{statusLabel(delay)}</Text>
      </VStack>
    ),

    // Dynamic Island expanded: trailing
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2}>
        <Text modifiers={[font({ size: 17, weight: 'bold' })]}>{props?.toCode}</Text>
        <Text modifiers={[caption2, foregroundStyle('secondary')]}>{props?.arriveTime}</Text>
      </VStack>
    ),

    // Dynamic Island expanded: bottom
    expandedBottom: (
      <Text modifiers={[caption2, foregroundStyle('secondary')]}>{props?.routeName}</Text>
    ),
  };
}

export const trainLiveActivity = createLiveActivity<TrainActivityProps>(
  'TrainLiveActivity',
  TrainLiveActivityLayout
);
