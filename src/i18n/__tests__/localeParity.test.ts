import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/;

function stripPluralSuffix(key: string): string {
  return key.replace(PLURAL_SUFFIX_RE, '');
}

function extractPlaceholders(text: string): string[] {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1]))).sort();
}

function flattenLocale(
  node: JsonValue,
  prefix = ''
): {
  leaves: Map<string, string>;
  arrays: Map<string, number>;
} {
  const leaves = new Map<string, string>();
  const arrays = new Map<string, number>();

  const visit = (value: JsonValue, path: string) => {
    if (typeof value === 'string') {
      leaves.set(path, value);
      return;
    }
    if (Array.isArray(value)) {
      arrays.set(path, value.length);
      value.forEach((item, index) => {
        visit(item, `${path}[${index}]`);
      });
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        visit(v, path ? `${path}.${k}` : k);
      }
    }
  };

  visit(node, prefix);
  return { leaves, arrays };
}

describe('i18n locale parity (en.json <-> ru.json)', () => {
  const enFlat = flattenLocale(en as JsonValue);
  const ruFlat = flattenLocale(ru as JsonValue);

  it('has matching normalized key sets across English and Russian bundles', () => {
    const enNormalized = new Set(
      Array.from(enFlat.leaves.keys()).map(stripPluralSuffix)
    );
    const ruNormalized = new Set(
      Array.from(ruFlat.leaves.keys()).map(stripPluralSuffix)
    );

    const missingInRu = Array.from(enNormalized).filter(
      (k) => !ruNormalized.has(k)
    );
    const missingInEn = Array.from(ruNormalized).filter(
      (k) => !enNormalized.has(k)
    );

    expect(missingInRu).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('provides full Russian plural forms (_one, _few, _many) for every English plural group', () => {
    const enPluralBases = new Set(
      Array.from(enFlat.leaves.keys())
        .filter((k) => PLURAL_SUFFIX_RE.test(k))
        .map(stripPluralSuffix)
    );

    const missingRussianForms: string[] = [];
    for (const base of enPluralBases) {
      for (const suffix of ['_one', '_few', '_many']) {
        const expectedKey = `${base}${suffix}`;
        if (!ruFlat.leaves.has(expectedKey)) {
          missingRussianForms.push(expectedKey);
        }
      }
    }

    expect(missingRussianForms).toEqual([]);
  });

  it('matches array lengths between en.json and ru.json (weekdays, months, slides, legal sections)', () => {
    const mismatches: string[] = [];
    for (const [path, enLen] of enFlat.arrays.entries()) {
      const ruLen = ruFlat.arrays.get(path);
      if (ruLen !== enLen) {
        mismatches.push(`${path}: en=${enLen}, ru=${ruLen ?? 'missing'}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('keeps {{variable}} interpolation placeholders identical between English and Russian strings', () => {
    const enPlaceholdersByBase = new Map<string, string[]>();
    for (const [key, value] of enFlat.leaves.entries()) {
      const base = stripPluralSuffix(key);
      if (!enPlaceholdersByBase.has(base)) {
        enPlaceholdersByBase.set(base, extractPlaceholders(value));
      }
    }

    const mismatches: string[] = [];
    for (const [ruKey, ruValue] of ruFlat.leaves.entries()) {
      const base = stripPluralSuffix(ruKey);
      const expected = enPlaceholdersByBase.get(base);
      if (!expected) continue;
      const actual = extractPlaceholders(ruValue);
      if (actual.join(',') !== expected.join(',')) {
        mismatches.push(
          `${ruKey}: expected [{{${expected.join('}}, {{')}}}] but got [{{${actual.join('}}, {{')}}}]`
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('contains no empty or whitespace-only leaf translations', () => {
    const emptyEn = Array.from(enFlat.leaves.entries())
      .filter(([, v]) => v.trim().length === 0)
      .map(([k]) => k);
    const emptyRu = Array.from(ruFlat.leaves.entries())
      .filter(([, v]) => v.trim().length === 0)
      .map(([k]) => k);

    expect(emptyEn).toEqual([]);
    expect(emptyRu).toEqual([]);
  });
});
