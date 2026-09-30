// ============================================================
// КОНСТАНТЫ И РОЛИ
// ============================================================

function getHourHeight() {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--hour-height').trim();
  return parseFloat(val) || 44;
}

// Цвета, доступные при создании задач и дедлайнов
const COLORS = [
  { name: 'Синий гигант',        value: '#7B9EFF' },
  { name: 'Пурпурная туманность', value: '#C77DFF' },
  { name: 'Голубая комета',      value: '#00BFFF' },
  { name: 'Фиолетовый пульсар',  value: '#A78BFA' },
  { name: 'Изумруд',             value: '#22C55E' },
  { name: 'Янтарь',              value: '#F59E0B' },
  { name: 'Коралл',              value: '#EF4444' },
  { name: 'Маджента',            value: '#EC4899' },
];

// Палитра для хэш-раскраски задач
const HASH_PALETTE = [
  '#7B9EFF', '#C77DFF', '#00BFFF', '#A78BFA',
  '#22C55E', '#F59E0B', '#EF4444', '#EC4899',
  '#14B8A6', '#8B5CF6', '#F97316', '#06B6D4',
];

// Типы задач
const TASK_TYPE = {
  SINGLE:  'single',    // разовая
  REGULAR: 'regular',   // регулярная
  BY_ROLE: 'by_role',   // на роль в организации
};

// Иерархия ролей
const roleRank  = { owner: 0, admin: 1, employee: 2 };
const roleNames = { owner: 'Владелец', admin: 'Администратор', employee: 'Сотрудник' };
const roleIcons = { owner: '👑', admin: '⭐', employee: '👤' };

// Организационные роли
const orgRoles = {
  manager:   'Менеджер',
  developer: 'Разработчик',
  designer:  'Дизайнер',
  support:   'Поддержка',
  all:       'Любая',
};

// Специальное значение "Все" в currentEmployee
const ALL_EMPLOYEES = 0;