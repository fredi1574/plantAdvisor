import { Eye, EyeOff } from 'lucide-react-native';
import React, { type ReactNode, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { usePalette } from '@/hooks/use-theme';

interface AuthIconInputProps extends TextInputProps {
  renderIcon: (color: string) => ReactNode;
  isPassword?: boolean;
}

/**
 * Focused-highlight icon-prefixed text input shared across Sign In and Sign Up screens.
 */
export function AuthIconInput({
  renderIcon,
  isPassword = false,
  onFocus,
  onBlur,
  ...rest
}: AuthIconInputProps) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      style={[
        styles.inputField,
        {
          backgroundColor: focused ? palette.bgSurface : palette.bgPrimary,
          borderColor: focused ? palette.primary : palette.borderSubtle,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: focused ? palette.primarySoft : palette.bgSubtle,
          },
        ]}>
        {renderIcon(focused ? palette.primary : palette.textMuted)}
      </View>

      <TextInput
        placeholderTextColor={palette.textMuted}
        style={[styles.input, { color: palette.textPrimary }]}
        secureTextEntry={isPassword && !showPassword}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />

      {isPassword && (
        <Pressable
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={10}
          style={styles.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? (
            <EyeOff size={16} color={palette.textMuted} />
          ) : (
            <Eye size={16} color={palette.textMuted} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  eyeBtn: {
    paddingHorizontal: 4,
  },
});
