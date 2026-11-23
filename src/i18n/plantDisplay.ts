const RU_COMMON_NAMES: Record<string, string> = {
  'Jade Plant': 'Толстянка (денежное дерево)',
  'Avocado Seed Propagation': 'Авокадо из косточки',
  'Swiss Cheese Plant': 'Монстера деликатесная',
  'Fiddle Leaf Fig': 'Фикус лировидный',
  'Snake Plant': 'Сансевиерия',
  'Peace Lily': 'Спатифиллум',
  'Spider Plant': 'Хлорофитум',
  'Golden Pothos': 'Эпипремнум золотистый',
};

const RU_LOCATIONS: Record<string, string> = {
  'South Living Room Sill': 'Южный подоконник в гостиной',
  'Kitchen Bright Window': 'Светлое окно на кухне',
  'East Living Room Corner': 'Восточный угол гостиной',
  'Living Room': 'Гостиная',
  Bedroom: 'Спальня',
  Kitchen: 'Кухня',
  Balcony: 'Балкон',
  Patio: 'Патио',
  'Unspecified Spot': 'Место не указано',
};

/**
 * Translate known default plant common names when Russian is active.
 */
export function localizeCommonName(name: string, language: string): string {
  if (language !== 'ru') return name;
  return RU_COMMON_NAMES[name.trim()] ?? name;
}

/**
 * Translate known default room/location names when Russian is active.
 */
export function localizeLocation(location: string, language: string): string {
  if (language !== 'ru') return location;
  return RU_LOCATIONS[location.trim()] ?? location;
}
