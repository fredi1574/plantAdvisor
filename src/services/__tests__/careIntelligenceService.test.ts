import {
  analyzeWeatherForecast,
  computeAdaptiveWateringInterval,
} from '@/services/careIntelligenceService';

describe('computeAdaptiveWateringInterval', () => {
  it('extends intervals in winter dormancy and shortens in summer terracotta', () => {
    const winter = computeAdaptiveWateringInterval(
      {
        baseWateringDays: 10,
        currentIntervalDays: 10,
        plantType: 'foliage',
        potMaterial: 'ceramic_glazed',
        isIndoor: true,
        lightExposure: 'bright_indirect',
      },
      { hemisphere: 'northern', referenceDate: new Date('2026-01-15T12:00:00Z') }
    );

    const summer = computeAdaptiveWateringInterval(
      {
        baseWateringDays: 10,
        currentIntervalDays: 10,
        plantType: 'foliage',
        potMaterial: 'terracotta',
        isIndoor: false,
        lightExposure: 'bright_direct',
      },
      { hemisphere: 'northern', referenceDate: new Date('2026-07-15T12:00:00Z') }
    );

    expect(winter.season).toBe('winter');
    expect(summer.season).toBe('summer');
    expect(winter.suggestedIntervalDays).toBeGreaterThan(
      summer.suggestedIntervalDays
    );
  });

  it('never drops succulents below 12 days', () => {
    const res = computeAdaptiveWateringInterval(
      {
        baseWateringDays: 12,
        currentIntervalDays: 12,
        plantType: 'succulent',
        potMaterial: 'terracotta',
        isIndoor: false,
        lightExposure: 'bright_direct',
        minimumDryBackDays: 12,
      },
      { hemisphere: 'northern', referenceDate: new Date('2026-07-15T12:00:00Z') }
    );
    expect(res.suggestedIntervalDays).toBeGreaterThanOrEqual(12);
  });
});

describe('analyzeWeatherForecast', () => {
  it('triggers frost alert below 3C and rain delay at >= 10mm precipitation', () => {
    const advisory = analyzeWeatherForecast({
      time: ['2026-11-16', '2026-11-17', '2026-11-18'],
      temperature_2m_min: [1.5, 4.0, 6.0],
      temperature_2m_max: [12, 14, 15],
      precipitation_sum: [12, 5, 0],
    });

    expect(advisory.hasFrostAlert).toBe(true);
    expect(advisory.hasHeavyRainDelay).toBe(true);
    expect(advisory.recommendedPushbackDays).toBeGreaterThanOrEqual(2);
    expect(advisory.alerts.some((a) => a.kind === 'frost')).toBe(true);
    expect(advisory.alerts.some((a) => a.kind === 'rain')).toBe(true);
  });
});
