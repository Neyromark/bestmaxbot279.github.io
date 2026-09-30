// ============================================================
// GANTT-КАЛЕНДАРЬ, ПАНЕЛЬ СОТРУДНИКОВ, DRAG-AND-DROP
// ============================================================

const calendarGrid = document.getElementById('calendarGrid');
const weekRangeLabel = document.getElementById('weekRangeLabel');
const poolTasksPanel = document.getElementById('poolTasksPanel');
const poolTaskList = document.getElementById('poolTaskList');

function renderUserStatus() {
  const badge = document.getElementById('userRoleBadge');
  const roleText = document.getElementById('userRoleText');
  const nameEl = document.getElementById('userNameText');

  badge.className = 'user-role-badge ' + currentUser.role;
  roleText.textContent = roleNames[currentUser.role];
  nameEl.textContent = currentUser.name;
}

function renderEmployeesBar() {
  const bar = document.getElementById('employeesBar');
  bar.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'employees-label';
  label.textContent = 'Сотрудники:';
  bar.appendChild(label);

  const visibleIds = getVisibleEmployeesForCurrentUser();

  // Кнопка «Все» — только для владельца и администратора
  if (!isEmployee()) {
    const allBtn = document.createElement('button');
    allBtn.className = 'employee-btn all-btn';
    allBtn.dataset.employee = String(ALL_EMPLOYEES);
    allBtn.textContent = 'Все';
    allBtn.addEventListener('click', () => selectEmployee(ALL_EMPLOYEES));
    bar.appendChild(allBtn);
  }

  employeesData
    .filter(emp => visibleIds.includes(emp.id))
    .forEach(emp => {
      const btn = document.createElement('button');
      btn.className = 'employee-btn';
      if (emp.role === 'owner') btn.classList.add('owner-btn');
      btn.dataset.employee = emp.id;
      btn.textContent = emp.name;
      btn.addEventListener('click', () => selectEmployee(emp.id));
      bar.appendChild(btn);
    });

  // Флаги режимов
  const flags = document.createElement('div');
  flags.className = 'view-flags';
  flags.innerHTML = `
    <button class="view-flag" id="flagEvents" data-flag="events">События</button>
    <button class="view-flag" id="flagDeadlines" data-flag="deadlines">Задачи</button>
  `;
  bar.appendChild(flags);

  flags.querySelector('#flagEvents').addEventListener('click', () => toggleViewFlag('events'));
  flags.querySelector('#flagDeadlines').addEventListener('click', () => toggleViewFlag('deadlines'));

  updateActiveEmployeeButton();
}

function selectEmployee(id) {
  if (id === ALL_EMPLOYEES && isEmployee()) return;
  if (id !== ALL_EMPLOYEES && !getVisibleEmployeesForCurrentUser().includes(id)) return;
  currentEmployee = id;
  updateActiveEmployeeButton();
  refreshActiveView();
}

function updateActiveEmployeeButton() {
  document.querySelectorAll('.employee-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.employee) === currentEmployee);
  });
}

function renderPoolTasks() {
  if (!poolTaskList || !currentUser) return;

  const poolRange = ensureCurrentAndNextWeekRegularInstances();
  poolTaskList.innerHTML = '';
  const poolInstances = instances.filter(instance => {
    const task = tasks[instance.task_id];
    if (!task || !task.is_pool) return false;
    if (task.type !== TASK_TYPE.REGULAR) return true;
    const dateKey = (instance.planned_start || instance.planned_end || '').slice(0, 10);
    return dateKey >= poolRange.start && dateKey <= poolRange.end;
  });

  const available = poolInstances.filter(instance => instance.assignee == null);
  const takenByUser = poolInstances.filter(instance => instance.assignee === currentUser.id);
  const visibleInstances = [...available, ...takenByUser];

  if (visibleInstances.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'pool-task-empty';
    empty.textContent = 'Сейчас в пуле нет задач.';
    poolTaskList.appendChild(empty);
    return;
  }

  visibleInstances.forEach(instance => {
    const card = document.createElement('article');
    card.className = 'pool-task-card';

    const details = document.createElement('div');
    details.className = 'pool-task-details';

    const title = document.createElement('strong');
    title.className = 'pool-task-title';
    const dateKey = (instance.planned_start || instance.planned_end || '').slice(0, 10);
    title.textContent = tasks[instance.task_id].type === TASK_TYPE.REGULAR
      ? `${instance.title} · ${formatDateHuman(dateKey)}`
      : instance.title;
    details.appendChild(title);

    if (instance.planned_start || instance.planned_end) {
      const schedule = document.createElement('span');
      schedule.className = 'pool-task-schedule';
      schedule.textContent = instance.planned_start && instance.planned_end
        ? `${formatDateTimeRu(instance.planned_start)} – ${instance.planned_end.slice(11, 16)}`
        : `Срок: ${formatDateTimeRu(instance.planned_end || instance.planned_start)}`;
      details.appendChild(schedule);
    }

    const isOverdue = instance.planned_end && new Date(instance.planned_end).getTime() < Date.now();
    if (isOverdue) {
      const overdue = document.createElement('span');
      overdue.className = 'pool-task-overdue';
      overdue.textContent = 'Просрочена';
      details.appendChild(overdue);
    }
    card.appendChild(details);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'pool-task-action';
    if (instance.assignee == null) {
      action.textContent = 'Взять';
      action.addEventListener('click', () => takePoolTask(instance.id));
    } else {
      action.textContent = 'Отказаться';
      action.addEventListener('click', () => returnPoolTask(instance.id));
    }
    card.appendChild(action);
    poolTaskList.appendChild(card);
  });
}

// Действия с пулом: все проверки (права, конфликты, «уже взял другой») делает сервер.
// Обновление экрана приходит через data_changed.
async function takePoolTask(instanceId) {
  if (!isEmployee()) return;
  const res = await api.request('pool.take', { instanceId });
  if (!res.ok) {
    await showApiError(res);
    refreshFromServer();
  }
}

async function returnPoolTask(instanceId) {
  if (!isEmployee()) return;
  const res = await api.request('pool.return', { instanceId });
  if (!res.ok) {
    await showApiError(res);
    refreshFromServer();
  }
}

function renderHoursColumn() {
  const col = document.getElementById('hoursColumn');
  col.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const label = document.createElement('div');
    label.className = 'hour-label';
    label.textContent = `${String(h).padStart(2, '0')}:00`;
    col.appendChild(label);
  }
}

// ============================================================
// DRAG-AND-DROP
// ============================================================
function makeInstanceDraggable(block, inst) {
  // Регулярные задачи не перетаскиваются — они привязаны к расписанию.
  // Ряд редактируется только как шаблон целиком.
  const task = tasks[inst.task_id];
  if (task && task.type === TASK_TYPE.REGULAR) return;

  let pointerId = null, startX = 0, startY = 0, dragging = false;

  function cleanup() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    if (pointerId != null) { try { block.releasePointerCapture(pointerId); } catch (_) {} }
    pointerId = null;
  }
  function resetVisual() {
    block.style.transform = '';
    block.classList.remove('dragging');
  }
  function onPointerMove(e) {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!dragging && Math.sqrt(dx * dx + dy * dy) > 6) {
      dragging = true;
      block.classList.add('dragging');
    }
    if (dragging) {
      block.style.transform = `translate(${dx}px, ${dy}px)`;
      e.preventDefault();
    }
  }
  function onPointerUp(e) {
    if (e.pointerId !== pointerId) return;
    const wasDragging = dragging;
    const cx = e.clientX, cy = e.clientY;
    const rect = block.getBoundingClientRect();
    const els = document.elementsFromPoint
      ? document.elementsFromPoint(cx, cy).filter(el => el !== block && !block.contains(el))
      : [];

    resetVisual();
    cleanup();

    if (!wasDragging) {
      openTaskModal({ mode: 'edit', instance: inst });
      return;
    }

    const targetColumn = els.map(el => el.closest && el.closest('.day-column')).find(c => c);
    if (!targetColumn) { renderGanttView(); return; }

    const newDate = targetColumn.dataset.date;
    const hoursGrid = targetColumn.querySelector('.hours-grid');
    if (!hoursGrid) { renderGanttView(); return; }

    const gridRect = hoursGrid.getBoundingClientRect();
    const hourHeight = getHourHeight();
    const topInGrid = rect.top - gridRect.top;
    const minutesInDay = (topInGrid / hourHeight) * 60;
    const duration =
      timeToMinutes(inst.planned_end.slice(11, 16)) -
      timeToMinutes(inst.planned_start.slice(11, 16));

    let requestedStart = Math.round(minutesInDay / 15) * 15;
    requestedStart = Math.max(0, Math.min(requestedStart, 24 * 60 - duration));

    const empId = inst.assignee;
    const overlap = findOverlappingInstance(
      empId, newDate,
      minutesToTime(requestedStart), minutesToTime(requestedStart + duration),
      inst.id
    );
    let freeStart = requestedStart;
    if (overlap) {
      freeStart = findFreeSlot(empId, newDate, requestedStart, duration, inst.id);
      if (freeStart === null) { refreshActiveView(); return; }
    }
    const newStart = minutesToTime(freeStart);
    const newEnd   = minutesToTime(freeStart + duration);
    api.request('task.update', {
      instanceId: inst.id, date: newDate, startTime: newStart, endTime: newEnd,
    }).then(async res => {
      if (!res.ok) await showApiError(res);
      refreshFromServer();          // при ошибке возвращаем блок на место
    });
  }
  function onPointerCancel() {
    resetVisual(); cleanup(); refreshActiveView();
  }

  block.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.delete-task-btn')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY;
    dragging = false;
    try { block.setPointerCapture(pointerId); } catch (_) {}
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  });
}

// ============================================================
// GANTT
// ============================================================
function renderGanttView() {
  if (currentEmployee === ALL_EMPLOYEES) return;

  ensureRegularInstances(currentWeekStart);

  const canEdit = canEditTasks();
  const HOUR_HEIGHT = getHourHeight();
  weekRangeLabel.textContent = formatWeekRange();

  const weekDays = getWeekDays();
  const todayKey = formatDateKey(new Date());
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  calendarGrid.innerHTML = '';

  weekDays.forEach(day => {
    const dateKey = formatDateKey(day);
    const isToday = dateKey === todayKey;
    const dayNumber = day.getDate();
    const weekdayName = getWeekdayShortName(day);

    const column = document.createElement('div');
    column.className = `day-column${isToday ? ' today' : ''}`;
    column.dataset.date = dateKey;

    const header = document.createElement('div');
    header.className = 'day-header-sticky';
    header.innerHTML = `
      <span class="weekday-name">${weekdayName}</span>
      <span class="day-number">${dayNumber}</span>
    `;
    column.appendChild(header);

    const hoursGrid = document.createElement('div');
    hoursGrid.className = 'hours-grid';

    for (let h = 0; h < 24; h++) {
      const slot = document.createElement('div');
      slot.className = 'hour-slot' + (canEdit ? '' : ' readonly');
      slot.dataset.hour = h;
      slot.dataset.date = dateKey;
      if (canEdit) {
        slot.addEventListener('click', (e) => {
          if (e.target.closest('.task-block')) return;
          openTaskModal({ mode: 'create', date: dateKey, startHour: h });
        });
      }
      hoursGrid.appendChild(slot);
    }

    const dayInstances = instances.filter(i =>
      i.assignee === currentEmployee &&
      i.planned_start && i.planned_end &&
      i.planned_start.slice(0, 10) === dateKey
    );

    dayInstances.forEach(inst => {
      const startMin = timeToMinutes(inst.planned_start.slice(11, 16));
      const endMin   = timeToMinutes(inst.planned_end.slice(11, 16));
      const top = (startMin / 60) * HOUR_HEIGHT;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

      const color = inst.color || '#7B9EFF';
      const task = tasks[inst.task_id];
      const isRegular = task && task.type === TASK_TYPE.REGULAR;
      const isImportant = inst.important ?? task?.important ?? false;

      const block = document.createElement('div');
      block.className = `task-block${inst.actual_end ? ' done' : ''}${isRegular ? ' regular' : ''}${isImportant ? ' important' : ''}${canEdit ? '' : ' readonly'}`;
      block.style.top = `${top}px`;
      block.style.height = `${height}px`;
      block.style.background = hexToRgba(color, 0.9);
      block.style.borderLeftColor = color;

      const title = document.createElement('div');
      title.className = 'task-title';
      title.innerHTML = `${isRegular ? '<span class="regular-icon" title="Регулярная задача">⟳</span>' : ''}${isImportant ? '<span class="star-icon" title="Важная задача">⭐</span>' : ''}<span>${escapeHtml(inst.title)}</span>`;
      block.appendChild(title);

      const timeEl = document.createElement('div');
      timeEl.className = 'task-time';
      timeEl.textContent = `${inst.planned_start.slice(11, 16)} – ${inst.planned_end.slice(11, 16)}`;
      block.appendChild(timeEl);

      if (canEdit) {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-task-btn';
        delBtn.textContent = '✕';
        delBtn.title = isRegular ? 'Удалить весь ряд' : 'Удалить';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteInstance(inst.id);
        });
        block.appendChild(delBtn);
        makeInstanceDraggable(block, inst);
      }

      hoursGrid.appendChild(block);
    });

    if (isToday) {
      const line = document.createElement('div');
      line.className = 'current-time-line';
      line.style.top = `${(currentMinutes / 60) * HOUR_HEIGHT}px`;
      hoursGrid.appendChild(line);
    }

    column.appendChild(hoursGrid);
    calendarGrid.appendChild(column);
  });

  if (!renderGanttView._scrolledOnce) {
    renderGanttView._scrolledOnce = true;
    setTimeout(() => {
      const container = document.querySelector('.calendar-grid-container');
      if (!container) return;
      const targetScrollY = (now.getHours() - 2) * HOUR_HEIGHT;
      container.scrollTop = Math.max(0, targetScrollY);
      const todayColumn = container.querySelector('.day-column.today');
      if (todayColumn) {
        const colLeft = todayColumn.offsetLeft;
        const colWidth = todayColumn.offsetWidth;
        const targetScrollX = colLeft - (container.clientWidth - colWidth) / 2;
        container.scrollLeft = Math.max(0, targetScrollX);
      }
    }, 100);
  }
}

// ============================================================
// УДАЛЕНИЕ ЭКЗЕМПЛЯРА (или всего ряда регулярной задачи)
// ============================================================
// Для регулярной задачи удаляем весь ряд: все её экземпляры
// и сам шаблон. Отдельный экземпляр удалить нельзя.
// Для разовой / ролевой / пул-задачи — удаляется только экземпляр.
async function deleteInstance(instanceId) {
  const inst = instances.find(i => i.id === instanceId);
  if (!inst) return;

  const task = tasks[inst.task_id];
  const isRegular = task && task.type === TASK_TYPE.REGULAR;

  if (isRegular) {
    const seriesCount = instances.filter(i => i.task_id === inst.task_id).length;
    const ok = await showConfirm(
      `«${inst.title}» — регулярная задача.\n\n` +
      `Отдельный экземпляр удалить нельзя. ` +
      `Удалить весь ряд целиком?\n\n` +
      `Будет удалено: ${seriesCount} экз.`
    );
    if (!ok) return;
  } else {
    if (!await showConfirm(`Удалить задачу «${inst.title}»?`)) return;
  }

  // Сервер сам удалит весь ряд для регулярной задачи
  const res = await api.request('task.delete', { instanceId });
  if (!res.ok) await showApiError(res);
  refreshFromServer();
}