// ============================================================
// РЕГУЛЯРНЫЕ ЗАДАЧИ
// Экземпляры создаёт и проверяет на конфликты СЕРВЕР (ORM, расписание вперёд на ~60 дней).
// Клиенту остались только вспомогательные функции окна пула.
// ============================================================

// Регулярные задачи из пула можно брать с сегодняшнего дня до конца следующей недели
function getCurrentAndNextWeekDateRange() {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const end = getStartOfWeek(today);
  end.setDate(end.getDate() + 13);
  return { start: todayKey, end: formatDateKey(end) };
}

// Оставлено для совместимости вызовов из calendar.js / deadlines.js
function ensureRegularInstances() {}
function ensureCurrentAndNextWeekRegularInstances() {
  return getCurrentAndNextWeekDateRange();
}
