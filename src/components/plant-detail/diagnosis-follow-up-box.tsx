import { HelpCircle, Sparkles } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

const QUICK_FOLLOW_UP_CHIPS = [
  'Check underside for webbing or specks',
  'Soil feels soggy / sour smell',
  'Placed near drafty AC or heater',
  'Recently repotted or moved',
] as const;

interface DiagnosisFollowUpBoxProps {
  questions: string[];
  answers: Record<number, string>;
  isRefining: boolean;
  onChangeAnswer: (index: number, value: string) => void;
  onRefine: () => void;
}

/**
 * Interactive follow-up questionnaire allowing gardeners to refine an AI health diagnosis.
 */
export function DiagnosisFollowUpBox({
  questions,
  answers,
  isRefining,
  onChangeAnswer,
  onRefine,
}: DiagnosisFollowUpBoxProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const quickChipsRaw = t('plantDetail.healthCard.quickChips', {
    returnObjects: true,
  }) as string[];
  const quickChips = Array.isArray(quickChipsRaw)
    ? quickChipsRaw
    : QUICK_FOLLOW_UP_CHIPS;

  if (questions.length === 0) return null;

  return (
    <View style={[styles.box, { backgroundColor: palette.bgSubtle }]}>
      <View style={styles.titleRow}>
        <HelpCircle size={14} color={palette.primary} />
        <Text style={[styles.title, { color: palette.primary }]}>
          {t('plantDetail.healthCard.followUpTitle')}
        </Text>
      </View>

      {questions.map((question, idx) => {
        const answer = answers[idx] ?? '';
        return (
          <View key={idx} style={[styles.item, idx > 0 && styles.itemSpaced]}>
            <Text style={[styles.question, { color: palette.textSecondary }]}>
              • {question}
            </Text>
            <View style={styles.chipsRow}>
              {quickChips.map((chip) => {
                const selected = answer === chip;
                return (
                  <Chip
                    key={chip}
                    label={chip}
                    selected={selected}
                    selectedStyle="solid"
                    onPress={() => {
                      triggerLightHaptic();
                      onChangeAnswer(idx, selected ? '' : chip);
                    }}
                  />
                );
              })}
            </View>
            <BotanicalInput
              value={answer}
              onChangeText={(value) => onChangeAnswer(idx, value)}
              placeholder={t('plantDetail.healthCard.followUpPlaceholder')}
            />
          </View>
        );
      })}

      <Pressable
        onPress={onRefine}
        disabled={isRefining}
        style={({ pressed }) => [
          styles.refineBtn,
          { backgroundColor: palette.primary },
          pressed && { opacity: 0.85 },
          isRefining && { opacity: 0.65 },
        ]}>
        {isRefining ? (
          <ActivityIndicator size="small" color={palette.textInverse} />
        ) : (
          <Sparkles size={14} color={palette.textInverse} />
        )}
        <Text style={[styles.refineBtnText, { color: palette.textInverse }]}>
          {isRefining
            ? t('plantDetail.healthCard.refiningBtn')
            : t('plantDetail.healthCard.refineBtn')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    ...Typography.caption,
    fontWeight: '700',
  },
  item: {
    gap: 6,
  },
  itemSpaced: {
    marginTop: 6,
  },
  question: {
    fontSize: 12,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  refineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  refineBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
