// ============================================================
// ДАТЫ, ВРЕМЯ, УТИЛИТЫ, ПЕРЕСЕЧЕНИЯ
// ============================================================

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getWeekDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    days.push(day);
  }
  return days;
}
function formatWeekRange() {
  const days = getWeekDays();
  const start = days[0], end = days[6];
  const sm = start.toLocaleString('ru', { month: 'long' });
  const em = end.toLocaleString('ru',   { month: 'long' });
  const sy = start.getFullYear(), ey = end.getFullYear();
  if (sy !== ey) return `${start.getDate()} ${sm} ${sy} – ${end.getDate()} ${em} ${ey}`;
  if (sm !== em) return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${sy}`;
  return `${start.getDate()} – ${end.getDate()} ${sm} ${sy}`;
}
function getWeekdayShortName(date) {
  return ['вс','пн','вт','ср','чт','пт','сб'][date.getDay()];
}
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(minutes) {
  const total = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function formatTimeRange(s, e) { return `${s} – ${e}`; }
function formatDateHuman(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${d} ${months[m - 1]}`;
}
function formatDeadlineTime(isoStr) {
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDateTimeRu(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDatetimeLocalValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toDateKeyValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function taskStartMs(task) { return new Date(`${task.date}T${task.startTime || task.endTime}:00`).getTime(); }
function taskEndMs(task)   { return new Date(`${task.date}T${task.endTime}:00`).getTime(); }

function findOverlappingTask(employeeId, dateKey, startTime, endTime, excludeTaskId) {
  const list = tasks[employeeId] || [];
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  for (const t of list) {
    if (t.id === excludeTaskId) continue;
    if (t.date !== dateKey) continue;
    const ts = timeToMinutes(t.startTime);
    const te = timeToMinutes(t.endTime);
    if (s < te && e > ts) return t;
  }
  return null;
}

function findOverlappingInstance(employeeId, dateKey, startTime, endTime, excludeId) {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  for (const instance of instances) {
    if (instance.id === excludeId || instance.assignee !== employeeId) continue;
    if (!instance.planned_start || !instance.planned_end) continue;
    if (instance.planned_start.slice(0, 10) !== dateKey) continue;

    const start = timeToMinutes(instance.planned_start.slice(11, 16));
    const end = timeToMinutes(instance.planned_end.slice(11, 16));
    if (s < end && e > start) return instance;
  }
  return null;
}

function findFreeSlot(employeeId, dateKey, preferredStart, duration, excludeTaskId) {
  const step = 15;
  const maxSearch = 4 * 60;
  const dayEnd = 24 * 60;
  for (let offset = 0; offset <= maxSearch; offset += step) {
    if (offset > 0) {
      const up = preferredStart - offset;
      if (up >= 0 && up + duration <= dayEnd) {
        if (!findOverlappingInstance(employeeId, dateKey,
            minutesToTime(up), minutesToTime(up + duration), excludeTaskId)) return up;
      }
    }
    const down = preferredStart + offset;
    if (down >= 0 && down + duration <= dayEnd) {
      if (!findOverlappingInstance(employeeId, dateKey,
          minutesToTime(down), minutesToTime(down + duration), excludeTaskId)) return down;
    }
  }
  return null;
}

function collectConflicts(employeeIds, dateKey, startTime, endTime, excludeTaskId) {
  const result = [];
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  for (const empId of employeeIds) {
    const overlap = [];
    for (const instance of instances) {
      if (instance.id === excludeTaskId || instance.assignee !== empId) continue;
      if (!instance.planned_start || !instance.planned_end) continue;
      if (instance.planned_start.slice(0, 10) !== dateKey) continue;

      const start = timeToMinutes(instance.planned_start.slice(11, 16));
      const end = timeToMinutes(instance.planned_end.slice(11, 16));
      if (s < end && e > start) overlap.push(instance);
    }
    if (overlap.length > 0) {
      result.push({
        employeeId: empId,
        employeeName: employeeNames[empId] || String(empId),
        tasks: overlap,
      });
    }
  }
  return result;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// ГЕНЕРАЦИЯ ЦЕЛОЧИСЛЕННЫХ ID
// ============================================================
function nextTaskId() {
  let max = 0;
  Object.values(tasks).forEach(list => {
    (list || []).forEach(t => { if (t.id > max) max = t.id; });
  });
  return max + 1;
}
function nextDeadlineId() {
  let max = 0;
  deadlines.forEach(d => { if (d.id > max) max = d.id; });
  return max + 1;
}