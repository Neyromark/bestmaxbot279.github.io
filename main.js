(function() {
    // ============================================================
    // КОНСТАНТЫ
    // ============================================================
    function getHourHeight() {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--hour-height').trim();
    return parseFloat(val) || 44;
    }

    const COLORS = [
    { name: 'Синий гигант',        value: '#471AFF' },
    { name: 'Пурпурная туманность', value: '#9500FF' },
    { name: 'Голубая комета',      value: '#00BFFF' },
    { name: 'Фиолетовый пульсар',  value: '#6E1AFF' },
    { name: 'Изумруд',             value: '#22C55E' },
    { name: 'Янтарь',              value: '#F59E0B' },
    { name: 'Коралл',              value: '#EF4444' },
    { name: 'Маджента',            value: '#EC4899' },
    ];

    // ---- СОТРУДНИКИ + РОЛИ ----
    const employeesData = [
    { id: 'ivan',   name: 'Иван Петров',    role: 'owner' },
    { id: 'anna',   name: 'Анна Смирнова',  role: 'admin' },
    { id: 'sergey', name: 'Сергей Иванов',  role: 'admin' },
    { id: 'elena',  name: 'Елена Петрова',  role: 'employee' },
    { id: 'dmitry', name: 'Дмитрий Козлов', role: 'employee' },
    ];
    const roleRank = { owner: 0, admin: 1, employee: 2 };
    const roleNames = { owner: 'Владелец', admin: 'Администратор', employee: 'Сотрудник' };

    // Строгая иерархия: owner → admin → employee
    employeesData.sort((a, b) => roleRank[a.role] - roleRank[b.role]);

    const employees = employeesData.map(e => e.id);
    const employeeNames = {};
    const employeeRoles = {};
    employeesData.forEach(e => {
    employeeNames[e.id] = e.name;
    employeeRoles[e.id] = e.role;
    });

    // ---- ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ----
    // Измените id здесь, чтобы посмотреть разные роли:
    // 'ivan' (owner), 'anna'/'sergey' (admin), 'elena'/'dmitry' (employee)
    function getDemoCurrentUser() {
    return employeesData.find(e => e.id === 'elena');
    }

    let currentUser = null;

    function canEditTasks() {
    return currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin');
    }
    function canManageDeadlines() {
    return currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin');
    }

    // ============================================================
    // СОСТОЯНИЕ
    // ============================================================
    let tasks = {};
    let deadlines = [];
    let currentEmployee = 'all';
    let currentWeekStart = getStartOfWeek(new Date());
    let viewMode = { events: true, deadlines: false };

    // ============================================================
    // ДАТЫ
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
    const em = end.toLocaleString('ru', { month: 'long' });
    const sy = start.getFullYear(), ey = end.getFullYear();
    if (sy !== ey) return `${start.getDate()} ${sm} ${sy} – ${end.getDate()} ${em} ${ey}`;
    if (sm !== em) return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${sy}`;
    return `${start.getDate()} – ${end.getDate()} ${sm} ${sy}`;
    }
    function getWeekdayShortName(date) {
    return ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()];
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
    function toDatetimeLocalValue(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    function taskStartMs(task) { return new Date(`${task.date}T${task.startTime}:00`).getTime(); }
    function taskEndMs(task)   { return new Date(`${task.date}T${task.endTime}:00`).getTime(); }

    // ============================================================
    // ПЕРЕСЕЧЕНИЯ
    // ============================================================
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
    function findFreeSlot(employeeId, dateKey, preferredStart, duration, excludeTaskId) {
    const step = 15;
    const maxSearch = 4 * 60;
    const dayEnd = 24 * 60;
    for (let offset = 0; offset <= maxSearch; offset += step) {
        if (offset > 0) {
        const up = preferredStart - offset;
        if (up >= 0 && up + duration <= dayEnd) {
            if (!findOverlappingTask(employeeId, dateKey,
                minutesToTime(up), minutesToTime(up + duration), excludeTaskId)) return up;
        }
        }
        const down = preferredStart + offset;
        if (down >= 0 && down + duration <= dayEnd) {
        if (!findOverlappingTask(employeeId, dateKey,
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
        const list = tasks[empId] || [];
        const overlap = [];
        for (const t of list) {
        if (t.id === excludeTaskId) continue;
        if (t.date !== dateKey) continue;
        const ts = timeToMinutes(t.startTime);
        const te = timeToMinutes(t.endTime);
        if (s < te && e > ts) overlap.push(t);
        }
        if (overlap.length > 0) {
        result.push({
            employeeId: empId,
            employeeName: employeeNames[empId] || empId,
            tasks: overlap,
        });
        }
    }
    return result;
    }

    // ============================================================
    // ДЕМО-ДАННЫЕ
    // ============================================================
    function getDemoTasks() {
    const today = new Date();
    function dateStr(offset) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }
    return {
        ivan: [
        { id: 'i1', text: 'Стратегическая сессия', date: dateStr(1), startTime: '10:00', endTime: '12:00', color: '#F59E0B', important: true },
        { id: 'i2', text: 'Встреча с партнёрами',  date: dateStr(0), startTime: '15:00', endTime: '16:30', color: '#471AFF', important: true },
        ],
        anna: [
        { id: 'a1', text: 'Созвон с командой', date: dateStr(0), startTime: '10:00', endTime: '11:00', color: '#471AFF', important: true },
        { id: 'a2', text: 'Подготовить отчёт', date: dateStr(1), startTime: '14:00', endTime: '16:00', color: '#9500FF', important: false },
        { id: 'a3', text: 'Проверить макеты', date: dateStr(-1), startTime: '09:30', endTime: '10:30', color: '#00BFFF', important: false },
        { id: 'a4', text: 'Обед с клиентом', date: dateStr(0), startTime: '13:00', endTime: '14:00', color: '#6E1AFF', important: false },
        { id: 'a5', text: 'Демо для инвесторов', date: dateStr(2), startTime: '12:00', endTime: '13:30', color: '#22C55E', important: true },
        ],
        sergey: [
        { id: 's1', text: 'Деплой обновления', date: dateStr(0), startTime: '11:00', endTime: '12:30', color: '#EF4444', important: true },
        { id: 's2', text: 'Код-ревью', date: dateStr(1), startTime: '15:00', endTime: '16:00', color: '#6E1AFF', important: false },
        { id: 's3', text: 'Архитектурная сессия', date: dateStr(3), startTime: '10:00', endTime: '11:30', color: '#00BFFF', important: false },
        ],
        elena: [
        { id: 'e1', text: 'Встреча с клиентом', date: dateStr(0), startTime: '09:00', endTime: '10:00', color: '#EC4899', important: true },
        { id: 'e2', text: 'Обновить документацию', date: dateStr(-1), startTime: '16:00', endTime: '18:00', color: '#22C55E', important: false },
        { id: 'e3', text: 'Тренинг', date: dateStr(1), startTime: '10:00', endTime: '12:00', color: '#F59E0B', important: false },
        ],
        dmitry: [
        { id: 'd1', text: 'Анализ метрик', date: dateStr(0), startTime: '14:00', endTime: '15:30', color: '#471AFF', important: false },
        { id: 'd2', text: 'Планирование спринта', date: dateStr(1), startTime: '11:00', endTime: '12:00', color: '#00BFFF', important: true },
        ]
    };
    }

    function getDemoDeadlines() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    function at(offsetDays, hh, mm) {
        const d = new Date(now);
        d.setDate(d.getDate() + offsetDays);
        d.setHours(hh, mm, 0, 0);
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(hh)}:${pad(mm)}`;
    }
    return [
        { id: 'dl0', text: 'Стратегическая сессия с советом', deadlineAt: at(5, 10, 0),  color: '#F59E0B', assignedUserId: 'ivan',   availableForIds: null },
        { id: 'dl1', text: 'Подготовить квартальный отчёт', deadlineAt: at(2, 18, 0),  color: '#471AFF', assignedUserId: 'anna',   availableForIds: null },
        { id: 'dl2', text: 'Обновить API-документацию',     deadlineAt: at(3, 12, 30), color: '#9500FF', assignedUserId: 'sergey', availableForIds: null },
        { id: 'dl3', text: 'Разобрать тикеты поддержки',    deadlineAt: at(1, 17, 0),  color: '#00BFFF', assignedUserId: null,     availableForIds: ['anna', 'elena', 'dmitry'] },
        { id: 'dl4', text: 'Согласовать макеты',            deadlineAt: at(-1, 14, 0), color: '#EF4444', assignedUserId: 'elena',  availableForIds: null },
        { id: 'dl5', text: 'Проверить релиз',               deadlineAt: at(0, 23, 59), color: '#22C55E', assignedUserId: null,     availableForIds: ['anna', 'sergey', 'elena', 'dmitry'] },
        { id: 'dl6', text: 'Финальная вычитка пресс-релиза', deadlineAt: at(-2, 10, 0), color: '#F59E0B', assignedUserId: 'sergey', availableForIds: null },
    ];
    }

    function loadData() {
    tasks = getDemoTasks();
    deadlines = getDemoDeadlines();
    }

    // ============================================================
    // ФИЛЬТРАЦИЯ
    // ============================================================
    // Возвращает id-шки, которые текущий пользователь имеет право видеть:
    // сам себя + строго ниже рангом (номер ранга больше).
    function getVisibleEmployeesForCurrentUser() {
    if (!currentUser) return employees.slice();
    const myRank = roleRank[currentUser.role];
    return employeesData
        .filter(e => e.id === currentUser.id || roleRank[e.role] > myRank)
        .map(e => e.id);
    }
    function isEmployee() {
    return !!currentUser && currentUser.role === 'employee';
    }
    function getVisibleEmployees() {
    const visible = getVisibleEmployeesForCurrentUser();
    if (currentEmployee === 'all') return visible;
    // страховка: выбранного явно сотрудника тоже проверяем на видимость
    if (!visible.includes(currentEmployee)) return [];
    return [currentEmployee];
    }
    function getDeadlinesFiltered() {
    // Сотрудник видит только свои дедлайны — и никогда чужие
    if (isEmployee()) {
        return deadlines.filter(dl => {
        if (dl.assignedUserId === currentUser.id) return true;
        if (dl.availableForIds && dl.availableForIds.includes(currentUser.id)) return true;
        return false;
        });
    }

    // Владелец/администратор — фильтрация по видимым
    const visible = getVisibleEmployeesForCurrentUser();

    if (currentEmployee === 'all') {
        return deadlines.filter(dl => {
        if (dl.assignedUserId) return visible.includes(dl.assignedUserId);
        if (dl.availableForIds) return dl.availableForIds.some(id => visible.includes(id));
        return false;
        });
    }

    return deadlines.filter(dl => {
        if (dl.assignedUserId === currentEmployee) return true;
        if (dl.availableForIds && dl.availableForIds.includes(currentEmployee)) return true;
        return false;
    });
    }
    function getEventsFiltered() {
    const result = [];
    getVisibleEmployees().forEach(empId => {
        (tasks[empId] || []).forEach(t => {
        result.push({ task: t, employeeId: empId });
        });
    });
    return result;
    }

    // ============================================================
    // СТАТУС ПОЛЬЗОВАТЕЛЯ + ПАНЕЛЬ СОТРУДНИКОВ
    // ============================================================
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

    // Сотрудники в иерархическом порядке (owner → admin → employee)
    // Сотрудники строго ниже рангом, чем текущий пользователь
    const visibleIds = getVisibleEmployeesForCurrentUser();

    // Кнопка «Все» — только для владельца и администратора
    if (!isEmployee()) {
        const allBtn = document.createElement('button');
        allBtn.className = 'employee-btn all-btn';
        allBtn.dataset.employee = 'all';
        allBtn.textContent = 'Все';
        allBtn.addEventListener('click', () => selectEmployee('all'));
        bar.appendChild(allBtn);
    }

    // Сотрудники в иерархическом порядке, только видимые
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

    // Флаги
    const flags = document.createElement('div');
    flags.className = 'view-flags';
    flags.innerHTML = `
        <button class="view-flag" id="flagEvents" data-flag="events">События</button>
        <button class="view-flag" id="flagDeadlines" data-flag="deadlines">Дедлайны</button>
    `;
    bar.appendChild(flags);

    flags.querySelector('#flagEvents').addEventListener('click', () => toggleViewFlag('events'));
    flags.querySelector('#flagDeadlines').addEventListener('click', () => toggleViewFlag('deadlines'));

    updateActiveEmployeeButton();
    }

    function selectEmployee(id) {
    currentEmployee = id;
    updateActiveEmployeeButton();
    refreshActiveView();
    }

    function updateActiveEmployeeButton() {
    document.querySelectorAll('.employee-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.employee === currentEmployee);
    });
    }

    // ============================================================
    // КОЛОНКА ЧАСОВ
    // ============================================================
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

    const calendarGrid = document.getElementById('calendarGrid');
    const weekRangeLabel = document.getElementById('weekRangeLabel');

    // ============================================================
    // ПЕРЕТАСКИВАНИЕ
    // ============================================================
    function makeTaskDraggable(block, task) {
    let pointerId = null;
    let startX = 0, startY = 0;
    let dragging = false;

    function cleanup() {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        if (pointerId != null) {
        try { block.releasePointerCapture(pointerId); } catch(_) {}
        }
        pointerId = null;
    }
    function resetVisual() {
        block.style.transform = '';
        block.classList.remove('dragging');
    }
    function onPointerMove(e) {
        if (e.pointerId !== pointerId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!dragging && dist > 6) {
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
        openTaskModal({ mode: 'edit', employeeId: currentEmployee, task: task });
        return;
        }

        const targetColumn = els
        .map(el => el.closest && el.closest('.day-column'))
        .find(c => c);
        if (!targetColumn) { renderGanttView(); return; }

        const newDate = targetColumn.dataset.date;
        const hoursGrid = targetColumn.querySelector('.hours-grid');
        if (!hoursGrid) { renderGanttView(); return; }

        const gridRect = hoursGrid.getBoundingClientRect();
        const hourHeight = getHourHeight();
        const topInGrid = rect.top - gridRect.top;
        const minutesInDay = (topInGrid / hourHeight) * 60;
        const duration = timeToMinutes(task.endTime) - timeToMinutes(task.startTime);

        let requestedStart = Math.round(minutesInDay / 15) * 15;
        requestedStart = Math.max(0, Math.min(requestedStart, 24 * 60 - duration));

        const hasOverlapAtRequested = findOverlappingTask(
        currentEmployee, newDate,
        minutesToTime(requestedStart), minutesToTime(requestedStart + duration),
        task.id
        );
        if (!hasOverlapAtRequested) {
        task.date = newDate;
        task.startTime = minutesToTime(requestedStart);
        task.endTime = minutesToTime(requestedStart + duration);
        refreshActiveView();
        return;
        }

        const freeStart = findFreeSlot(currentEmployee, newDate, requestedStart, duration, task.id);
        if (freeStart !== null) {
        task.date = newDate;
        task.startTime = minutesToTime(freeStart);
        task.endTime = minutesToTime(freeStart + duration);
        refreshActiveView();
        return;
        }
        refreshActiveView();
    }
    function onPointerCancel(e) {
        if (e.pointerId !== pointerId) return;
        resetVisual();
        cleanup();
        refreshActiveView();
    }

    block.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.delete-task-btn')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        dragging = false;
        try { block.setPointerCapture(pointerId); } catch(_) {}
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
    });
    }

    // ============================================================
    // GANTT
    // ============================================================
    function renderGanttView() {
    if (currentEmployee === 'all') return;

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
            openTaskModal({
                mode: 'create',
                employeeId: currentEmployee,
                date: dateKey,
                startHour: h,
            });
            });
        }
        hoursGrid.appendChild(slot);
        }

        const dayTasks = (tasks[currentEmployee] || []).filter(t => t.date === dateKey);
        dayTasks.forEach(task => {
        const startMin = timeToMinutes(task.startTime);
        const endMin = timeToMinutes(task.endTime);
        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

        const block = document.createElement('div');
        block.className = `task-block${task.important ? ' important' : ''}${canEdit ? '' : ' readonly'}`;
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.background = hexToRgba(task.color, 0.9);
        block.style.borderLeftColor = task.color;

        const title = document.createElement('div');
        title.className = 'task-title';
        title.innerHTML = `${task.important ? '<span class="star-icon">⭐</span>' : ''}<span>${escapeHtml(task.text)}</span>`;
        block.appendChild(title);

        const timeEl = document.createElement('div');
        timeEl.className = 'task-time';
        timeEl.textContent = formatTimeRange(task.startTime, task.endTime);
        block.appendChild(timeEl);

        if (canEdit) {
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-task-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Удалить';
            delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить задачу?')) deleteTask(currentEmployee, task.id);
            });
            block.appendChild(delBtn);

            makeTaskDraggable(block, task);
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

            // Вертикальный скролл к текущему времени (−2 часа запаса сверху)
            const targetScrollY = (now.getHours() - 2) * HOUR_HEIGHT;
            container.scrollTop = Math.max(0, targetScrollY);

            // Горизонтальный скролл: сегодняшний день — по центру видимой области.
            // Если сегодняшнего дня нет на текущей неделе (например, листаем другую) —
            // скролл не трогаем.
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
    // ДЕДЛАЙНЫ
    // ============================================================
    function getDeadlineStatus(dl, nowMs) {
    const deadlineMs = new Date(dl.deadlineAt).getTime();
    if (deadlineMs < nowMs) return 'done';
    if (dl.assignedUserId) return 'in_progress';
    return 'todo';
    }

    // Может ли текущий пользователь принять этот дедлайн
    function canAcceptDeadline(dl) {
    if (!dl.availableForIds || dl.assignedUserId) return false;
    if (!dl.availableForIds.includes(currentUser.id)) return false;
    // Показываем кнопку только когда смотрим "Все" или собственный календарь
    if (currentEmployee !== 'all' && currentEmployee !== currentUser.id) return false;
    return true;
    }

    function buildDeadlineItem(dl, isOverdue) {
    const item = document.createElement('div');
    item.className = 'deadline-item' + (dl.availableForIds && !dl.assignedUserId ? ' selective' : '');
    item.style.color = dl.color;

    const marker = document.createElement('span');
    marker.className = 'dl-marker';
    marker.textContent = '!';
    item.appendChild(marker);

    const body = document.createElement('div');
    body.className = 'dl-body';

    const time = document.createElement('span');
    time.className = 'dl-time';
    time.textContent = formatDeadlineTime(dl.deadlineAt);
    body.appendChild(time);

    const text = document.createElement('span');
    text.className = 'dl-text';
    text.textContent = dl.text;
    body.appendChild(text);

    if (currentEmployee === 'all') {
        const owner = document.createElement('span');
        owner.className = 'dl-owner';
        if (dl.assignedUserId) {
        owner.textContent = employeeNames[dl.assignedUserId] || dl.assignedUserId;
        } else {
        owner.textContent = 'Выборочный';
        }
        body.appendChild(owner);
    }

    if (isOverdue) {
        const overdue = document.createElement('span');
        overdue.className = 'dl-overdue';
        overdue.textContent = 'Просрочено';
        body.appendChild(overdue);
    }

    // Кнопка "Принять" для выборочных дедлайнов
    if (canAcceptDeadline(dl)) {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-deadline-btn';
        acceptBtn.textContent = 'Принять';
        acceptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        acceptDeadline(dl.id);
        });
        body.appendChild(acceptBtn);
    }

    item.appendChild(body);

    // Кнопка удаления — только для админов/владельца
    if (canManageDeadlines()) {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-deadline-btn';
        delBtn.textContent = '✕';
        delBtn.title = 'Удалить дедлайн';
        delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Удалить дедлайн «${dl.text}»?`)) {
            deleteDeadline(dl.id);
        }
        });
        item.appendChild(delBtn);
    }

    return item;
    }

    function acceptDeadline(id) {
    const dl = deadlines.find(d => d.id === id);
    if (!dl) return;
    if (!dl.availableForIds || !dl.availableForIds.includes(currentUser.id)) return;
    if (!confirm(`Принять дедлайн «${dl.text}»?`)) return;
    dl.assignedUserId = currentUser.id;
    dl.availableForIds = null;
    refreshActiveView();
    }

    function buildEventItem(event) {
    const t = event.task;
    const nowMs = Date.now();
    const startMs = taskStartMs(t);
    const endMs = taskEndMs(t);

    const item = document.createElement('div');
    item.className = 'event-item';
    item.style.color = t.color || '#471AFF';

    const marker = document.createElement('span');
    marker.className = 'ev-marker';
    marker.textContent = (endMs < nowMs) ? '✓' : '☐';
    item.appendChild(marker);

    const body = document.createElement('div');
    body.className = 'ev-body';

    const time = document.createElement('span');
    time.className = 'ev-time';
    time.textContent = `${formatDateKey(new Date(startMs)).split('-').reverse().slice(0,2).join('.')} ${t.startTime}–${t.endTime}`;
    body.appendChild(time);

    const text = document.createElement('span');
    text.className = 'ev-text';
    text.textContent = t.text;
    body.appendChild(text);

    if (currentEmployee === 'all') {
        const owner = document.createElement('span');
        owner.className = 'ev-owner';
        owner.textContent = employeeNames[event.employeeId] || event.employeeId;
        body.appendChild(owner);
    }

    item.appendChild(body);
    return item;
    }

    function renderDeadlinesView() {
    const nowMs = Date.now();

    const filteredDeadlines = getDeadlinesFiltered().slice().sort((a, b) => {
        return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
    });

    const dlByStatus = { done: [], in_progress: [], todo: [] };
    filteredDeadlines.forEach(dl => {
        const st = getDeadlineStatus(dl, nowMs);
        dlByStatus[st].push(dl);
    });

    let eventsByStatus = { done: [], in_progress: [], todo: [] };
    if (viewMode.events) {
        const allEvents = getEventsFiltered();
        const limitMs = nowMs + 8 * 24 * 60 * 60 * 1000;
        allEvents.forEach(ev => {
        const s = taskStartMs(ev.task);
        const e = taskEndMs(ev.task);
        if (e <= nowMs) {
            if (e >= nowMs - 7 * 24 * 60 * 60 * 1000) {
            eventsByStatus.done.push(ev);
            }
        } else if (s <= nowMs && nowMs < e) {
            eventsByStatus.in_progress.push(ev);
        } else if (s > nowMs && s <= limitMs) {
            eventsByStatus.todo.push(ev);
        }
        });
        ['done', 'in_progress', 'todo'].forEach(k => {
        eventsByStatus[k].sort((a, b) => taskStartMs(a.task) - taskStartMs(b.task));
        });
    }

    const cols = {
        done: document.getElementById('colDone'),
        in_progress: document.getElementById('colInProgress'),
        todo: document.getElementById('colTodo'),
    };

    Object.keys(cols).forEach(status => {
        const cont = cols[status];
        cont.innerHTML = '';

        const dlLabel = document.createElement('div');
        dlLabel.className = 'section-label';
        dlLabel.textContent = 'Дедлайны:';
        cont.appendChild(dlLabel);

        const dlList = document.createElement('div');
        dlList.className = 'deadline-list';
        if (dlByStatus[status].length === 0) {
        const empty = document.createElement('div');
        empty.className = 'column-empty';
        empty.textContent = '—';
        dlList.appendChild(empty);
        } else {
        dlByStatus[status].forEach(dl => {
            dlList.appendChild(buildDeadlineItem(dl, status === 'done'));
        });
        }
        cont.appendChild(dlList);

        if (viewMode.events) {
        const evLabel = document.createElement('div');
        evLabel.className = 'section-label';
        evLabel.textContent = 'События:';
        cont.appendChild(evLabel);

        const evList = document.createElement('div');
        evList.className = 'event-list';
        if (eventsByStatus[status].length === 0) {
            const empty = document.createElement('div');
            empty.className = 'column-empty';
            empty.textContent = '—';
            evList.appendChild(empty);
        } else {
            eventsByStatus[status].forEach(ev => {
            evList.appendChild(buildEventItem(ev));
            });
        }
        cont.appendChild(evList);
        }
    });

    setTimeout(updateAllScrollGradients, 0);
    }

    function updateAllScrollGradients() {
    document.querySelectorAll('.column-body').forEach(body => {
        const content = body.querySelector('.column-content');
        if (!content) return;
        const isScrollable = content.scrollHeight > content.clientHeight + 1;
        if (!isScrollable) {
        body.classList.add('scrolled-bottom', 'no-scroll');
        return;
        }
        body.classList.remove('no-scroll');
        const atBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 5;
        body.classList.toggle('scrolled-bottom', atBottom);
    });
    }

    function initScrollGradients() {
    document.querySelectorAll('.column-body').forEach(body => {
        const content = body.querySelector('.column-content');
        if (!content) return;
        content.addEventListener('scroll', () => {
        const isScrollable = content.scrollHeight > content.clientHeight + 1;
        if (!isScrollable) {
            body.classList.add('scrolled-bottom');
            return;
        }
        const atBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 5;
        body.classList.toggle('scrolled-bottom', atBottom);
        }, { passive: true });
    });
    }

    // ============================================================
    // ДИСПЕТЧЕР ВИДА
    // ============================================================
    function refreshActiveView() {
    document.getElementById('flagEvents').classList.toggle('active', viewMode.events);
    document.getElementById('flagDeadlines').classList.toggle('active', viewMode.deadlines);

    document.getElementById('addTaskBtn').style.display =
        (viewMode.events && canEditTasks()) ? '' : 'none';
    document.getElementById('addDeadlineBtn').style.display =
        (viewMode.deadlines && canManageDeadlines()) ? '' : 'none';

    const gantt = document.getElementById('ganttContainer');
    const allHint = document.getElementById('allHint');
    const dlView = document.getElementById('deadlinesView');
    const weekNav = document.getElementById('weekNav');

    if (viewMode.events && !viewMode.deadlines) {
        if (currentEmployee === 'all') {
        gantt.style.display = 'none';
        allHint.classList.add('visible');
        dlView.style.display = 'none';
        weekNav.style.display = 'none';
        } else {
        gantt.style.display = '';
        allHint.classList.remove('visible');
        dlView.style.display = 'none';
        weekNav.style.display = '';
        renderGanttView();
        }
    } else {
        gantt.style.display = 'none';
        allHint.classList.remove('visible');
        dlView.style.display = 'grid';
        weekNav.style.display = 'none';
        renderDeadlinesView();
    }
    }

    function renderCalendar() { refreshActiveView(); }

    // Новая логика тумблеров:
    // - если активен только этот флаг → переключаемся на противоположный
    // - если активны оба → выключаем кликнутый
    // - если этот выключен → включаем его (оба активны)
    function toggleViewFlag(flag) {
    const other = flag === 'events' ? 'deadlines' : 'events';
    const thisOn = viewMode[flag];
    const otherOn = viewMode[other];

    if (thisOn && !otherOn) {
        viewMode = { events: false, deadlines: false };
        viewMode[other] = true;
    } else if (thisOn && otherOn) {
        viewMode[flag] = false;
    } else {
        viewMode[flag] = true;
    }
    refreshActiveView();
    }

    // ============================================================
    // УТИЛИТЫ
    // ============================================================
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

    // ============================================================
    // МОДАЛКА ЗАДАЧИ
    // ============================================================
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const taskTitleInput = document.getElementById('taskTitleInput');
    const taskStartTime = document.getElementById('taskStartTime');
    const taskEndTime = document.getElementById('taskEndTime');
    const colorPicker = document.getElementById('colorPicker');
    const importantToggle = document.getElementById('importantToggle');
    const toggleCheckbox = document.getElementById('toggleCheckbox');
    const toggleCheckIcon = document.getElementById('toggleCheckIcon');
    const deleteBtn = document.getElementById('deleteBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    const employeeSelect = document.getElementById('employeeSelect');
    const employeeSelectTrigger = document.getElementById('employeeSelectTrigger');
    const employeeSelectLabel = document.getElementById('employeeSelectLabel');
    const employeeSelectDropdown = document.getElementById('employeeSelectDropdown');
    const employeeStatic = document.getElementById('employeeStatic');

    let modalState = {
    mode: 'create', employeeId: null, employeeIds: [], date: null, task: null,
    selectedColor: COLORS[0].value, important: false,
    };

    function renderEmployeeDropdown() {
    employeeSelectDropdown.innerHTML = '';
    employees.forEach(empId => {
        const opt = document.createElement('label');
        opt.className = 'employee-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = empId;
        cb.checked = modalState.employeeIds.includes(empId);
        cb.addEventListener('change', () => {
        if (cb.checked) {
            if (!modalState.employeeIds.includes(empId)) modalState.employeeIds.push(empId);
        } else {
            modalState.employeeIds = modalState.employeeIds.filter(id => id !== empId);
        }
        updateEmployeeSelectLabel();
        });
        opt.appendChild(cb);
        const span = document.createElement('span');
        span.textContent = employeeNames[empId] || empId;
        opt.appendChild(span);
        opt.addEventListener('click', (e) => { e.stopPropagation(); });
        employeeSelectDropdown.appendChild(opt);
    });
    }

    function updateEmployeeSelectLabel() {
    const ids = modalState.employeeIds;
    if (ids.length === 0) {
        employeeSelectLabel.textContent = 'Выберите сотрудников';
        employeeSelectLabel.classList.add('placeholder');
        return;
    }
    employeeSelectLabel.classList.remove('placeholder');
    if (ids.length <= 2) {
        employeeSelectLabel.textContent = ids.map(id => employeeNames[id] || id).join(', ');
    } else {
        employeeSelectLabel.textContent = `Выбрано: ${ids.length}`;
    }
    }

    function closeEmployeeDropdown() { employeeSelect.classList.remove('open'); }

    employeeSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    employeeSelect.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
    if (!employeeSelect.contains(e.target)) closeEmployeeDropdown();
    });

    function renderColorPicker() {
    colorPicker.innerHTML = '';
    COLORS.forEach(c => {
        const opt = document.createElement('div');
        opt.className = 'color-option' + (c.value === modalState.selectedColor ? ' selected' : '');
        opt.style.background = c.value;
        opt.title = c.name;
        opt.addEventListener('click', () => {
        modalState.selectedColor = c.value;
        renderColorPicker();
        });
        colorPicker.appendChild(opt);
    });
    }

    function updateImportantUI() {
    if (modalState.important) {
        importantToggle.classList.add('active');
        toggleCheckbox.style.background = 'var(--max-gradient)';
        toggleCheckbox.style.borderColor = 'transparent';
        toggleCheckIcon.style.display = 'block';
        toggleCheckIcon.style.color = 'white';
    } else {
        importantToggle.classList.remove('active');
        toggleCheckbox.style.background = 'white';
        toggleCheckbox.style.borderColor = '#C9B8FF';
        toggleCheckIcon.style.display = 'none';
    }
    }

    importantToggle.addEventListener('click', () => {
    modalState.important = !modalState.important;
    updateImportantUI();
    });

    function openTaskModal({ mode, employeeId, date, startHour, task }) {
    // Employee не может открывать модалку создания/редактирования
    if (!canEditTasks()) return;

    modalState.mode = mode;
    modalState.date = date;
    modalState.task = task || null;

    if (mode === 'create') {
        modalState.employeeId = null;
        modalState.employeeIds = currentEmployee === 'all' ? employees.slice() : [currentEmployee];

        modalTitle.textContent = 'Новая задача';
        modalSubtitle.textContent = formatDateHuman(date);

        employeeSelect.style.display = '';
        employeeStatic.style.display = 'none';

        renderEmployeeDropdown();
        updateEmployeeSelectLabel();
        closeEmployeeDropdown();

        taskTitleInput.value = '';
        const hour = startHour != null ? startHour : 9;
        taskStartTime.value = `${String(hour).padStart(2, '0')}:00`;
        taskEndTime.value = `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`;
        modalState.selectedColor = COLORS[0].value;
        modalState.important = false;
        deleteBtn.style.display = 'none';
    } else {
        modalState.employeeId = employeeId;
        modalState.employeeIds = [employeeId];

        modalTitle.textContent = 'Редактирование задачи';
        modalSubtitle.textContent = formatDateHuman(task.date);

        employeeSelect.style.display = 'none';
        employeeStatic.style.display = '';
        employeeStatic.textContent = employeeNames[employeeId] || employeeId;

        taskTitleInput.value = task.text;
        taskStartTime.value = task.startTime;
        taskEndTime.value = task.endTime;
        modalState.selectedColor = task.color || COLORS[0].value;
        modalState.important = !!task.important;
        deleteBtn.style.display = 'block';
    }

    renderColorPicker();
    updateImportantUI();
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.innerWidth > 640) setTimeout(() => taskTitleInput.focus(), 50);
    }

    function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    modalState.task = null;
    closeEmployeeDropdown();
    }

    saveBtn.addEventListener('click', () => {
    const text = taskTitleInput.value.trim();
    if (!text) {
        taskTitleInput.focus();
        taskTitleInput.style.borderColor = '#EF4444';
        setTimeout(() => taskTitleInput.style.borderColor = '', 1500);
        return;
    }
    const start = taskStartTime.value || '09:00';
    const end = taskEndTime.value || '10:00';
    if (timeToMinutes(end) <= timeToMinutes(start)) {
        alert('Время окончания должно быть позже времени начала');
        return;
    }

    if (modalState.mode === 'create') {
        if (modalState.employeeIds.length === 0) {
        alert('Выберите хотя бы одного сотрудника');
        return;
        }
        const conflicts = collectConflicts(
        modalState.employeeIds, modalState.date, start, end, null
        );
        if (conflicts.length > 0) {
        const lines = ['Не удалось добавить задачу — обнаружены пересечения:', ''];
        conflicts.forEach(c => {
            lines.push(`• ${c.employeeName}:`);
            c.tasks.forEach(t => {
            lines.push(`   — «${t.text}» (${t.startTime} – ${t.endTime})`);
            });
            lines.push('');
        });
        lines.push('Задача не была добавлена никому из выбранных сотрудников.');
        alert(lines.join('\n'));
        return;
        }

        modalState.employeeIds.forEach(empId => {
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '_' + empId,
            text, date: modalState.date, startTime: start, endTime: end,
            color: modalState.selectedColor, important: modalState.important,
        };
        if (!tasks[empId]) tasks[empId] = [];
        tasks[empId].push(newTask);
        });

        closeModal();
        refreshActiveView();
        return;
    }

    const excludeId = modalState.task ? modalState.task.id : null;
    const overlapping = findOverlappingTask(
        modalState.employeeId, modalState.date, start, end, excludeId
    );
    if (overlapping) {
        alert(
        `Это время пересекается с задачей «${overlapping.text}» ` +
        `(${overlapping.startTime}–${overlapping.endTime}). ` +
        `Пожалуйста, выберите другое время.`
        );
        return;
    }

    const task = tasks[modalState.employeeId].find(t => t.id === modalState.task.id);
    if (task) {
        task.text = text;
        task.startTime = start;
        task.endTime = end;
        task.color = modalState.selectedColor;
        task.important = modalState.important;
    }
    closeModal();
    refreshActiveView();
    });

    deleteBtn.addEventListener('click', () => {
    if (!modalState.task || !modalState.employeeId) return;
    if (confirm('Удалить задачу?')) {
        deleteTask(modalState.employeeId, modalState.task.id);
        closeModal();
    }
    });

    cancelBtn.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
    if (e.key === 'Escape' && deadlineModalOverlay.classList.contains('open')) closeDeadlineModal();
    });

    function deleteTask(employeeId, taskId) {
    if (!tasks[employeeId]) return;
    tasks[employeeId] = tasks[employeeId].filter(t => t.id !== taskId);
    refreshActiveView();
    }

    document.getElementById('addTaskBtn').addEventListener('click', () => {
    if (!canEditTasks()) return;

    const today = new Date();
    const todayKey = formatDateKey(today);
    const weekDays = getWeekDays();
    const weekDateKeys = weekDays.map(d => formatDateKey(d));

    let targetDate, targetHour;
    if (weekDateKeys.includes(todayKey)) {
        targetDate = todayKey;
        targetHour = today.getHours() + 1;
        if (targetHour >= 24) targetHour = 9;
    } else {
        targetDate = weekDateKeys[0];
        targetHour = 9;
    }

    if (currentEmployee !== 'all') {
        const duration = 60;
        let slotStart = targetHour * 60;
        if (findOverlappingTask(currentEmployee, targetDate,
            minutesToTime(slotStart), minutesToTime(slotStart + duration), null)) {
        const free = findFreeSlot(currentEmployee, targetDate, slotStart, duration, null);
        if (free !== null) slotStart = free;
        }
        targetHour = Math.floor(slotStart / 60);
    }

    openTaskModal({
        mode: 'create',
        employeeId: currentEmployee,
        date: targetDate,
        startHour: targetHour,
    });
    });

    // ============================================================
    // МОДАЛКА ДЕДЛАЙНА
    // ============================================================
    const deadlineModalOverlay = document.getElementById('deadlineModalOverlay');
    const deadlineModalCloseBtn = document.getElementById('deadlineModalCloseBtn');
    const deadlineTextInput = document.getElementById('deadlineTextInput');
    const deadlineAtInput = document.getElementById('deadlineAtInput');
    const deadlineColorPicker = document.getElementById('deadlineColorPicker');
    const selectiveToggle = document.getElementById('selectiveToggle');
    const selectiveCheckbox = document.getElementById('selectiveCheckbox');
    const selectiveCheckIcon = document.getElementById('selectiveCheckIcon');
    const deadlineCancelBtn = document.getElementById('deadlineCancelBtn');
    const deadlineSaveBtn = document.getElementById('deadlineSaveBtn');

    const dlEmployeeSelect = document.getElementById('dlEmployeeSelect');
    const dlEmployeeSelectTrigger = document.getElementById('dlEmployeeSelectTrigger');
    const dlEmployeeSelectLabel = document.getElementById('dlEmployeeSelectLabel');
    const dlEmployeeSelectDropdown = document.getElementById('dlEmployeeSelectDropdown');

    let deadlineState = {
    employeeIds: [], selectedColor: COLORS[0].value, selective: false,
    };

    function renderDlEmployeeDropdown() {
    dlEmployeeSelectDropdown.innerHTML = '';
    employees.forEach(empId => {
        const opt = document.createElement('label');
        opt.className = 'employee-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = empId;
        cb.checked = deadlineState.employeeIds.includes(empId);
        cb.addEventListener('change', () => {
        if (cb.checked) {
            if (!deadlineState.employeeIds.includes(empId)) deadlineState.employeeIds.push(empId);
        } else {
            deadlineState.employeeIds = deadlineState.employeeIds.filter(id => id !== empId);
        }
        updateDlEmployeeSelectLabel();
        });
        opt.appendChild(cb);
        const span = document.createElement('span');
        span.textContent = employeeNames[empId] || empId;
        opt.appendChild(span);
        opt.addEventListener('click', (e) => { e.stopPropagation(); });
        dlEmployeeSelectDropdown.appendChild(opt);
    });
    }

    function updateDlEmployeeSelectLabel() {
    const ids = deadlineState.employeeIds;
    if (ids.length === 0) {
        dlEmployeeSelectLabel.textContent = 'Выберите сотрудников';
        dlEmployeeSelectLabel.classList.add('placeholder');
        return;
    }
    dlEmployeeSelectLabel.classList.remove('placeholder');
    if (ids.length <= 2) {
        dlEmployeeSelectLabel.textContent = ids.map(id => employeeNames[id] || id).join(', ');
    } else {
        dlEmployeeSelectLabel.textContent = `Выбрано: ${ids.length}`;
    }
    }

    function closeDlEmployeeDropdown() { dlEmployeeSelect.classList.remove('open'); }

    dlEmployeeSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dlEmployeeSelect.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
    if (!dlEmployeeSelect.contains(e.target)) closeDlEmployeeDropdown();
    });

    function renderDeadlineColorPicker() {
    deadlineColorPicker.innerHTML = '';
    COLORS.forEach(c => {
        const opt = document.createElement('div');
        opt.className = 'color-option' + (c.value === deadlineState.selectedColor ? ' selected' : '');
        opt.style.background = c.value;
        opt.title = c.name;
        opt.addEventListener('click', () => {
        deadlineState.selectedColor = c.value;
        renderDeadlineColorPicker();
        });
        deadlineColorPicker.appendChild(opt);
    });
    }

    function updateSelectiveUI() {
    if (deadlineState.selective) {
        selectiveToggle.classList.add('active');
        selectiveCheckbox.style.background = 'var(--max-gradient)';
        selectiveCheckbox.style.borderColor = 'transparent';
        selectiveCheckIcon.style.display = 'block';
        selectiveCheckIcon.style.color = 'white';
    } else {
        selectiveToggle.classList.remove('active');
        selectiveCheckbox.style.background = 'white';
        selectiveCheckbox.style.borderColor = '#C9B8FF';
        selectiveCheckIcon.style.display = 'none';
    }
    }

    selectiveToggle.addEventListener('click', () => {
    deadlineState.selective = !deadlineState.selective;
    updateSelectiveUI();
    });

    function openDeadlineModal() {
    if (!canManageDeadlines()) return;

    deadlineState.employeeIds = currentEmployee === 'all' ? employees.slice() : [currentEmployee];
    deadlineState.selectedColor = COLORS[0].value;
    deadlineState.selective = false;

    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    defaultDate.setMinutes(0, 0, 0);
    deadlineAtInput.value = toDatetimeLocalValue(defaultDate);
    deadlineTextInput.value = '';

    renderDlEmployeeDropdown();
    updateDlEmployeeSelectLabel();
    closeDlEmployeeDropdown();
    renderDeadlineColorPicker();
    updateSelectiveUI();

    deadlineModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.innerWidth > 640) setTimeout(() => deadlineTextInput.focus(), 50);
    }

    function closeDeadlineModal() {
    deadlineModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    closeDlEmployeeDropdown();
    }

    deadlineCancelBtn.addEventListener('click', closeDeadlineModal);
    deadlineModalCloseBtn.addEventListener('click', closeDeadlineModal);
    deadlineModalOverlay.addEventListener('click', (e) => {
    if (e.target === deadlineModalOverlay) closeDeadlineModal();
    });

    deadlineSaveBtn.addEventListener('click', () => {
    const text = deadlineTextInput.value.trim();
    if (!text) {
        deadlineTextInput.focus();
        deadlineTextInput.style.borderColor = '#EF4444';
        setTimeout(() => deadlineTextInput.style.borderColor = '', 1500);
        return;
    }

    const at = deadlineAtInput.value;
    if (!at) {
        deadlineAtInput.focus();
        alert('Укажите срок дедлайна');
        return;
    }
    if (new Date(at).getTime() <= Date.now()) {
        if (!confirm('Указанный срок уже прошёл. Продолжить?')) return;
    }

    if (deadlineState.employeeIds.length === 0) {
        alert('Выберите хотя бы одного сотрудника');
        return;
    }

    if (deadlineState.selective) {
        deadlines.push({
        id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        text, deadlineAt: at, color: deadlineState.selectedColor,
        assignedUserId: null,
        availableForIds: deadlineState.employeeIds.slice(),
        });
    } else {
        deadlineState.employeeIds.forEach(empId => {
        deadlines.push({
            id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '_' + empId,
            text, deadlineAt: at, color: deadlineState.selectedColor,
            assignedUserId: empId,
            availableForIds: null,
        });
        });
    }

    closeDeadlineModal();
    refreshActiveView();
    });

    function deleteDeadline(id) {
    deadlines = deadlines.filter(d => d.id !== id);
    refreshActiveView();
    }

    document.getElementById('addDeadlineBtn').addEventListener('click', openDeadlineModal);

    // ============================================================
    // НАВИГАЦИЯ
    // ============================================================
    function initWeekNavigation() {
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderGanttView();
    });
    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderGanttView();
    });
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentWeekStart = getStartOfWeek(new Date());
        renderGanttView._scrolledOnce = false;
        renderGanttView();
    });
    }

    // ============================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================================
    function init() {
    currentUser = getDemoCurrentUser();
    renderUserStatus();

    loadData();

    // Начинаем с собственного календаря пользователя
    currentEmployee = currentUser.id;
    currentWeekStart = getStartOfWeek(new Date());

    renderEmployeesBar();   // включает и обработчики флагов
    renderHoursColumn();
    initWeekNavigation();
    initScrollGradients();
    refreshActiveView();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
        renderHoursColumn();
        refreshActiveView();
        }, 200);
    });

    setInterval(() => {
        if (viewMode.events && !viewMode.deadlines && currentEmployee !== 'all') {
        const today = document.querySelector('.day-column.today');
        if (today) renderGanttView();
        } else if (!(viewMode.events && !viewMode.deadlines)) {
        renderDeadlinesView();
        }
    }, 60000);
    }

    init();
})();