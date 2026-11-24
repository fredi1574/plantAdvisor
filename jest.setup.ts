import i18n from './src/i18n';

void i18n.changeLanguage('en');

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ type: 'cancelled', data: null })),
    signOut: jest.fn(async () => null),
  },
  isSuccessResponse: (res: { type?: string }) => res?.type === 'success',
  isCancelledResponse: (res: { type?: string }) => res?.type === 'cancelled',
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    TIME_INTERVAL: 'timeInterval',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));

jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === '__esModule') return true;
        const IconMock = (props: Record<string, unknown>) =>
          React.createElement(View, { testID: `icon-${prop}`, ...props });
        IconMock.displayName = `Lucide${prop}`;
        return IconMock;
      },
    }
  );
});

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, ScrollView } = require('react-native');
  const makeChainable = () => {
    const chain: Record<string, () => unknown> = {};
    for (const method of ['duration', 'delay', 'springify', 'damping', 'stiffness', 'mass']) {
      chain[method] = () => chain;
    }
    return chain;
  };
  return {
    __esModule: true,
    default: {
      View,
      Text,
      ScrollView,
      createAnimatedComponent: <T,>(Comp: T) => Comp,
    },
    View,
    Text,
    ScrollView,
    createAnimatedComponent: <T,>(Comp: T) => Comp,
    useSharedValue: <T,>(initial: T) => ({
      value: initial,
      get: () => initial,
      set: (next: T) => {
        initial = next;
      },
    }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    useAnimatedProps: (fn: () => Record<string, unknown>) => fn(),
    useReducedMotion: () => true,
    withTiming: <T,>(val: T) => val,
    withSpring: <T,>(val: T) => val,
    withRepeat: <T,>(val: T) => val,
    Easing: {
      ease: (t: number) => t,
      cubic: (t: number) => t,
      out: (fn: (t: number) => number) => fn,
      inOut: (fn: (t: number) => number) => fn,
    },
    FadeInDown: makeChainable(),
    LinearTransition: makeChainable(),
  };
});
