import { CalendarCheck2, Sparkles, Sprout, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BorderWidth,
  CardShadow,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { AiQuotaStatus } from '@/types/plant';

interface AiLimitModalProps {
  visible: boolean;
  quota: AiQuotaStatus | null;
  onClose: () => void;
  onAddManual?: () => void;
}

function formatResetTime(
  resetAt: string | undefined,
  locale: string,
  fallback: string
): string {
  if (!resetAt) return fallback;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function AiLimitModal({
  visible,
  quota,
  onClose,
  onAddManual,
}: AiLimitModalProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const limit = quota?.limit ?? 5;
  const resetText = formatResetTime(
    quota?.resetAt,
    i18n.language,
    t('aiLimit.midnightUtc')
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: palette.attentionBg,
                  borderColor: palette.attentionBorder,
                },
              ]}
            >
              <Sparkles size={18} color={palette.attentionText} />
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close AI scan limit dialog"
              style={[styles.closeBtn, { backgroundColor: palette.bgSubtle }]}
            >
              <X size={16} color={palette.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {t('aiLimit.title')}
          </Text>
          <Text style={[styles.body, { color: palette.textSecondary }]}>
            {t('aiLimit.body', { limit, resetTime: resetText })}
          </Text>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
              },
            ]}
          >
            <CalendarCheck2 size={16} color={palette.primary} />
            <Text style={[styles.infoText, { color: palette.textPrimary }]}>
              {t('aiLimit.infoText')}
            </Text>
          </View>

          <View style={styles.actionsCol}>
            {onAddManual ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onAddManual();
                }}
                accessibilityRole="button"
                accessibilityLabel="Add plant manually instead"
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: palette.primary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Sprout size={16} color={palette.textInverse} />
                <Text
                  style={[styles.primaryBtnText, { color: palette.textInverse }]}
                >
                  {t('aiLimit.addManualBtn')}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Dismiss AI scan limit dialog"
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[styles.secondaryBtnText, { color: palette.textPrimary }]}
              >
                {t('aiLimit.gotItBtn')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...CardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  actionsCol: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
