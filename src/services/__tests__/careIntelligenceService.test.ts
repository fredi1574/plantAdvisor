import i18n from '@/i18n';
import {
  analyzeWeatherForecast,
  clearWeatherAdvisoryCache,
  computeAdaptiveWateringInterval,
  fetchOutdoorWeatherAdvisory,
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

  it('localizes adaptive care and weather alerts in Russian', async () => {
    await i18n.changeLanguage('ru');
    try {
      const interval = computeAdaptiveWateringInterval(
        {
          baseWateringDays: 10,
          currentIntervalDays: 10,
          plantType: 'foliage',
          potMaterial: 'terracotta',
          isIndoor: true,
          lightExposure: 'bright_indirect',
        },
        { hemisphere: 'northern', referenceDate: new Date('2026-01-15T12:00:00Z') }
      );
      expect(interval.factors[0]).toContain('Зимний покой');

      const advisory = analyzeWeatherForecast({
        time: ['2026-11-16'],
        temperature_2m_min: [1.0],
        temperature_2m_max: [10],
        precipitation_sum: [0],
      });
      expect(advisory.alerts[0]?.title).toContain('Угроза заморозков');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('caches Open-Meteo advisories for 30 minutes and bypasses cache on forceRefresh', async () => {
    clearWeatherAdvisoryCache();
    const originalFetch = globalThis.fetch;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: {
          time: ['2026-11-16'],
          temperature_2m_min: [10],
          temperature_2m_max: [20],
          precipitation_sum: [0],
        },
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const first = await fetchOutdoorWeatherAdvisory(51.51, -0.13);
      expect(first.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const second = await fetchOutdoorWeatherAdvisory(51.51, -0.13);
      expect(second.fromCache).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const refreshed = await fetchOutdoorWeatherAdvisory(51.51, -0.13, {
        forceRefresh: true,
      });
      expect(refreshed.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherAdvisoryCache();
    }
  });
});
