import { MOCK_COMPANIES } from '../companies/companies';

// Фильтр 1: цвет, id, описание
export interface ColorFilterItem {
  id: number;
  color: string;
  description: string;
}

// Фильтр 2: название, id, описание
export interface NameFilterItem {
  id: number;
  name: string;
  description: string;
}

// Фильтр «Оператор»: 4 вводных на один пункт — сокращённое, полное название, код компании, владелец
export interface OperatorItem {
  id: number;
  name: string; // для сортировки, без ОПФ
  shortName: string;
  fullName: string;
  code: string;
  owner: string;
}

export interface WagonRow {
  id: number;
  wagonNumber: string;
  containerNumber: string;
  colorId: number;
  nameId: number;
  operatorId: number;
  ownerId: number; // собственник — id из MOCK_COMPANIES (сокращённое и полное название)
  station: string;
  weight: number; // тонны
  arrivalDate: string;
}

export const MOCK_COLORS: ColorFilterItem[] = [
  { id: 1, color: '#198754', description: 'В пути' },
  { id: 2, color: '#0d6efd', description: 'На станции' },
  { id: 3, color: '#ffc107', description: 'Ожидает выгрузки' },
  { id: 4, color: '#dc3545', description: 'Неисправность' },
  { id: 5, color: '#6c757d', description: 'В резерве' },
  { id: 6, color: '#20c997', description: 'Под погрузкой' },
  { id: 7, color: '#6f42c1', description: 'На таможне' },
  { id: 8, color: '#fd7e14', description: 'Задержан' },
  { id: 9, color: '#0dcaf0', description: 'В ремонте' },
  { id: 10, color: '#d63384', description: 'Ожидает документы' },
  { id: 11, color: '#343a40', description: 'Списан' },
  { id: 12, color: '#adb5bd', description: 'Статус не определён' },
];

const SIZES = [
  { code: '20', title: '20 футов' },
  { code: '40', title: '40 футов' },
  { code: '45', title: '45 футов' },
];
const KINDS = [
  { code: 'DC', title: 'Сухогрузный' },
  { code: 'HC', title: 'Высокий' },
  { code: 'RF', title: 'Рефрижератор' },
  { code: 'OT', title: 'Открытый верх' },
  { code: 'FR', title: 'Платформа с торцами' },
  { code: 'TK', title: 'Танк-контейнер' },
  { code: 'PL', title: 'Платформа' },
];

export const MOCK_NAMES: NameFilterItem[] = SIZES.flatMap((s) =>
  KINDS.map((k) => ({ name: `${s.code}${k.code}`, description: `${k.title}, ${s.title}` })),
).map((item, i) => ({ id: i + 1, ...item }));

// Компании и люди вымышленные
export const MOCK_OPERATORS: OperatorItem[] = [
  { id: 1, name: 'Восток-Транзит', shortName: 'ООО «Восток-Транзит»', fullName: 'Общество с ограниченной ответственностью «Восток-Транзит»', code: 'VT-1024', owner: 'Петров Андрей Сергеевич' },
  { id: 2, name: 'СибКонтейнер', shortName: 'АО «СибКонтейнер»', fullName: 'Акционерное общество «Сибирский контейнерный оператор»', code: 'SK-2071', owner: 'Кузнецова Марина Олеговна' },
  { id: 3, name: 'Урал-Логистик', shortName: 'ООО «Урал-Логистик»', fullName: 'Общество с ограниченной ответственностью «Урал-Логистик»', code: 'UL-0388', owner: 'Смирнов Игорь Павлович' },
  { id: 4, name: 'Балтийская экспедиция', shortName: 'ООО «БалтЭкспедиция»', fullName: 'Общество с ограниченной ответственностью «Балтийская экспедиция»', code: 'BE-5512', owner: 'Орлова Наталья Викторовна' },
  { id: 5, name: 'ЮгРейл', shortName: 'АО «ЮгРейл»', fullName: 'Акционерное общество «Южная железнодорожная компания»', code: 'YR-7730', owner: 'Волков Дмитрий Андреевич' },
  { id: 6, name: 'Арктик Карго', shortName: 'ООО «Арктик Карго»', fullName: 'Общество с ограниченной ответственностью «Арктик Карго»', code: 'AC-9045', owner: 'Лебедев Константин Ильич' },
  { id: 7, name: 'Волга Терминал', shortName: 'ПАО «Волга Терминал»', fullName: 'Публичное акционерное общество «Волжский терминальный комплекс»', code: 'VTK-1166', owner: 'Соколова Елена Анатольевна' },
  { id: 8, name: 'Сергеев С. Н.', shortName: 'ИП Сергеев С. Н.', fullName: 'Индивидуальный предприниматель Сергеев Сергей Николаевич', code: 'IP-3307', owner: 'Сергеев Сергей Николаевич' },
];

export const STATIONS = [
  'Москва-Товарная', 'Екатеринбург-Сорт.', 'Новосибирск-Главный', 'Казань', 'Владивосток',
  'Самара', 'Красноярск', 'Иркутск', 'Хабаровск', 'Омск', 'Челябинск', 'Пермь',
  'Нижний Новгород', 'Ростов-Товарный', 'Новороссийск', 'Санкт-Петербург-Сорт.',
  'Мурманск', 'Тюмень', 'Уфа', 'Забайкальск',
];
const PREFIXES = ['MSKU', 'TGHU', 'CMAU', 'RZDU', 'FESU', 'TKRU', 'SEGU', 'BMOU'];

// детерминированный ГПСЧ, чтобы моки не менялись между перезагрузками
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(42);
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

export const MOCK_WAGONS: WagonRow[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  wagonNumber: String(50_000_000 + Math.floor(rnd() * 9_999_999)),
  containerNumber: `${pick(PREFIXES)}${String(Math.floor(rnd() * 9_999_999)).padStart(7, '0')}`,
  colorId: pick(MOCK_COLORS).id,
  nameId: pick(MOCK_NAMES).id,
  station: pick(STATIONS),
  weight: Math.round((2 + rnd() * 28) * 10) / 10,
  arrivalDate: new Date(2026, 8, 1 + Math.floor(rnd() * 37), Math.floor(rnd() * 24), Math.floor(rnd() * 60)).toISOString(),
  ownerId: pick(MOCK_COMPANIES).id,
  operatorId: pick(MOCK_OPERATORS).id,
}));
