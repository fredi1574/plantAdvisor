import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_SIGNIN_PLUGIN = '@react-native-google-signin/google-signin';
const DEFAULT_IOS_URL_SCHEME =
  'com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID';

function resolveGoogleIosUrlScheme(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  if (fromEnv && fromEnv.startsWith('com.googleusercontent.apps.')) {
    return fromEnv;
  }
  return DEFAULT_IOS_URL_SCHEME;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = resolveGoogleIosUrlScheme();
  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === GOOGLE_SIGNIN_PLUGIN) {
      const existingOptions =
        typeof plugin[1] === 'object' && plugin[1] !== null ? plugin[1] : {};
      return [GOOGLE_SIGNIN_PLUGIN, { ...existingOptions, iosUrlScheme }];
    }
    return plugin;
  }) as ExpoConfig['plugins'];

  return {
    ...config,
    name: config.name ?? 'FloraLog',
    slug: config.slug ?? 'plantAdvisor',
    plugins,
  };
};
