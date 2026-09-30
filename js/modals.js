// ============================================================
// МОДАЛКИ
// ============================================================

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskStartTime = document.getElementById('taskStartTime');
const taskEndTime = document.getElementById('taskEndTime');
const deleteBtn = document.getElementById('deleteBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const employeeSelect = document.getElementById('employeeSelect');
const employeeSelectTrigger = document.getElementById('employeeSelectTrigger');
const employeeSelectLabel = document.getElementById('employeeSelectLabel');
const employeeSelectDropdown = document.getElementById('employeeSelectDropdown');
const employeeStatic = document.getElementById('employeeStatic');

// --- Новые элементы модалки. Могут отсутствовать в старой вёрстке — работаем защищённо.
const singleTimeBlock  = document.getElementById('singleTimeBlock');
const modalTypeRow     = document.getElementById('modalTypeRow');
const typeSingleBtn    = document.getElementById('typeSingleBtn');
const typeRegularBtn   = document.getElementById('typeRegularBtn');
const poolToggle       = document.getElementById('poolToggle');
const poolCheckbox     = document.getElementById('poolCheckbox');
const poolCheckIcon    = document.getElementById('poolCheckIcon');
const regularBlock     = document.getElementById('regularBlock');
const regularDeadline  = document.getElementById('regularDeadline');
const regularStart     = document.getElementById('regularStart');
const weekdaysRow      = document.getElementById('weekdaysRow');
const periodStartInput = document.getElementById('periodStartInput');
const periodEndInput   = document.getElementById('periodEndInput');
const periodEndless    = document.getElementById('periodEndless');
const weightInput      = document.getElementById('weightInput');
const estimateInput    = document.getElementById('estimateInput');
const importantToggle  = document.getElementById('importantToggle');
const toggleCheckbox   = document.getElementById('toggleCheckbox');
const toggleCheckIcon  = document.getElementById('toggleCheckIcon');

let modalState = {
  mode: 'create',
  type: TASK_TYPE.SINGLE,
  isPool: false,
  important: false,
  employeeIds: [],
  instance: null,
  date: null,
  weekdays: [],
  selectedColor: COLORS[0].value,
};

// ============================================================
// СЕЛЕКТ СОТРУДНИКОВ
// ============================================================
function renderEmployeeDropdown() {
  if (!employeeSelectDropdown) return;
  employeeSelectDropdown.innerHTML = '';
  const assignable = getAssignableEmployeesForCurrentUser();

  employeesData
    .filter(emp => assignable.includes(emp.id))
    .forEach(emp => {
      const opt = document.createElement('label');
      opt.className = 'employee-option';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = emp.id;
      cb.checked = modalState.employeeIds.includes(emp.id);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!modalState.employeeIds.includes(emp.id)) modalState.employeeIds.push(emp.id);
        } else {
          modalState.employeeIds = modalState.employeeIds.filter(id => id !== emp.id);
        }
        updateEmployeeSelectLabel();
      });
      opt.appendChild(cb);

      const span = document.createElement('span');
      span.textContent = `${roleIcons[emp.role] || ''} ${employeeNames[emp.id]}`.trim();
      opt.appendChild(span);

      opt.addEventListener('click', (e) => { e.stopPropagation(); });
      employeeSelectDropdown.appendChild(opt);
    });
}

function updateEmployeeSelectLabel() {
  if (!employeeSelectLabel) return;
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

function closeEmployeeDropdown() {
  if (employeeSelect) employeeSelect.classList.remove('open');
}

if (employeeSelectTrigger && employeeSelect) {
  employeeSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    employeeSelect.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!employeeSelect.contains(e.target)) closeEmployeeDropdown();
  });
}

// ============================================================
// ТУМБЛЕР «В ПУЛ»
// ============================================================
function updatePoolUI() {
  if (poolToggle) poolToggle.setAttribute('aria-pressed', String(modalState.isPool));
  if (poolToggle && poolCheckbox && poolCheckIcon) {
    if (modalState.isPool) {
      poolToggle.classList.add('active');
      poolCheckbox.style.background = 'var(--max-gradient)';
      poolCheckbox.style.borderColor = 'transparent';
      poolCheckIcon.style.display = 'block';
      poolCheckIcon.style.color = 'white';
    } else {
      poolToggle.classList.remove('active');
      poolCheckbox.style.background = 'white';
      poolCheckbox.style.borderColor = '#C9B8FF';
      poolCheckIcon.style.display = 'none';
    }
  }
  if (employeeSelect) {
    employeeSelect.style.display = modalState.isPool ? 'none' : '';
  }
  if (employeeStatic) employeeStatic.style.display = 'none';
}

if (poolToggle) {
  poolToggle.addEventListener('click', () => {
    modalState.isPool = !modalState.isPool;
    if (modalState.isPool) modalState.employeeIds = [];
    updatePoolUI();
  });
}

function updateImportantUI() {
  if (importantToggle) {
    importantToggle.classList.toggle('active', modalState.important);
    importantToggle.setAttribute('aria-pressed', String(modalState.important));
  }
  if (toggleCheckbox) {
    toggleCheckbox.style.background = modalState.important ? 'var(--max-gradient)' : 'white';
    toggleCheckbox.style.borderColor = modalState.important ? 'transparent' : '#C9B8FF';
  }
  if (toggleCheckIcon) {
    toggleCheckIcon.style.display = modalState.important ? 'block' : 'none';
    toggleCheckIcon.style.color = 'white';
  }
}

if (importantToggle) {
  importantToggle.addEventListener('click', () => {
    modalState.important = !modalState.important;
    updateImportantUI();
  });
}

// ============================================================
// ТИП ЗАДАЧИ
// ============================================================
function updateTypeUI() {
  const isReg = modalState.type === TASK_TYPE.REGULAR;
  // Все обращения — под защитой: если элементы не найдены, просто ничего не делаем.
  if (typeSingleBtn)  typeSingleBtn.classList.toggle('active', !isReg);
  if (typeRegularBtn) typeRegularBtn.classList.toggle('active', isReg);
  if (regularBlock)   regularBlock.style.display = isReg ? '' : 'none';
  // Общая пара «Начало / Дедлайн» — только для разовой задачи.
  if (singleTimeBlock) singleTimeBlock.style.display = isReg ? 'none' : '';
}

if (typeSingleBtn) {
  typeSingleBtn.addEventListener('click', () => {
    modalState.type = TASK_TYPE.SINGLE;
    updateTypeUI();
  });
}
if (typeRegularBtn) {
  typeRegularBtn.addEventListener('click', () => {
    modalState.type = TASK_TYPE.REGULAR;
    updateTypeUI();
  });
}

// ============================================================
// ДНИ НЕДЕЛИ
// ============================================================
const WEEKDAY_LABELS = [
  { n: 1, s: 'Пн' }, { n: 2, s: 'Вт' }, { n: 3, s: 'Ср' },
  { n: 4, s: 'Чт' }, { n: 5, s: 'Пт' }, { n: 6, s: 'Сб' }, { n: 0, s: 'Вс' },
];
function renderWeekdays() {
  if (!weekdaysRow) return;
  weekdaysRow.innerHTML = '';
  WEEKDAY_LABELS.forEach(({ n, s }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'weekday-chip' + (modalState.weekdays.includes(n) ? ' active' : '');
    btn.textContent = s;
    btn.addEventListener('click', () => {
      if (modalState.weekdays.includes(n)) {
        modalState.weekdays = modalState.weekdays.filter(x => x !== n);
      } else {
        modalState.weekdays.push(n);
      }
      renderWeekdays();
    });
    weekdaysRow.appendChild(btn);
  });
}

// ============================================================
// ОТКРЫТИЕ МОДАЛКИ
// ============================================================
function openTaskModal({ mode, date, startHour, instance }) {
  if (!canEditTasks()) return;

  // ---- Редактирование существующего экземпляра ----
  if (mode === 'edit' && instance) {
    modalState.mode = 'edit';
    modalState.instance = instance;
    modalState.type = TASK_TYPE.SINGLE;

    const task = tasks[instance.task_id];
    const isRegular = task && task.type === TASK_TYPE.REGULAR;
    modalState.important = instance.important ?? task?.important ?? false;
    modalState.selectedColor = instance.color || task?.color || COLORS[0].value;
    renderTaskColorPicker();

    if (modalTitle) modalTitle.textContent = isRegular ? 'Регулярная задача' : 'Задача';
    if (modalSubtitle) {
      modalSubtitle.textContent = instance.planned_start
        ? `${formatDateTimeRu(instance.planned_start)} — ${instance.planned_end ? instance.planned_end.slice(11, 16) : ''}`
        : 'Без срока';
    }

    if (modalTypeRow)     modalTypeRow.style.display = 'none';
    if (poolToggle)       poolToggle.style.display = 'none';
    if (importantToggle)  importantToggle.style.display = isRegular ? 'none' : '';
    if (regularBlock)     regularBlock.style.display = 'none';
    if (singleTimeBlock)  singleTimeBlock.style.display = '';
    if (employeeSelect)   employeeSelect.style.display = 'none';
    if (employeeStatic) {
      employeeStatic.style.display = '';
      employeeStatic.textContent = instance.assignee
        ? (employeeNames[instance.assignee] || instance.assignee)
        : 'Пул';
    }

    if (taskTitleInput) taskTitleInput.value = instance.title;
    if (taskStartTime && instance.planned_start) taskStartTime.value = instance.planned_start.slice(11, 16);
    if (taskEndTime   && instance.planned_end)   taskEndTime.value   = instance.planned_end.slice(11, 16);
    if (weightInput)   weightInput.value   = instance.weight || 1;
    if (estimateInput) estimateInput.value = instance.estimated_minutes || 30;
    updateImportantUI();

    if (deleteBtn) {
      deleteBtn.style.display = 'block';
      deleteBtn.textContent = isRegular ? 'Удалить весь ряд' : 'Удалить';
    }

    if (isRegular) {
      // Регулярный экземпляр править нельзя — только удалить весь ряд.
      if (taskTitleInput) taskTitleInput.disabled = true;
      if (taskStartTime)  taskStartTime.disabled = true;
      if (taskEndTime)    taskEndTime.disabled = true;
      if (weightInput)    weightInput.disabled = true;
      if (estimateInput)  estimateInput.disabled = true;
      if (saveBtn) saveBtn.style.display = 'none';
    } else {
      if (taskTitleInput) taskTitleInput.disabled = false;
      if (taskStartTime)  taskStartTime.disabled = false;
      if (taskEndTime)    taskEndTime.disabled = false;
      if (weightInput)    weightInput.disabled = false;
      if (estimateInput)  estimateInput.disabled = false;
      if (saveBtn) saveBtn.style.display = '';
    }

    if (modalOverlay) modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    return;
  }

  // ---- Создание ----
  modalState.mode = 'create';
  modalState.instance = null;
  modalState.type = TASK_TYPE.SINGLE;
  modalState.isPool = false;
  modalState.important = false;
  modalState.selectedColor = COLORS[0].value;
  renderTaskColorPicker();
  modalState.date = date;
  modalState.weekdays = [1, 2, 3, 4, 5];

  if (modalTitle) modalTitle.textContent = 'Новая задача';
  if (modalSubtitle) modalSubtitle.textContent = formatDateHuman(date);

  if (modalTypeRow)    modalTypeRow.style.display = '';
  if (poolToggle)      poolToggle.style.display = '';
  if (importantToggle) importantToggle.style.display = '';
  if (regularBlock)    regularBlock.style.display = 'none';
  if (singleTimeBlock) singleTimeBlock.style.display = '';
  if (deleteBtn) deleteBtn.style.display = 'none';
  if (saveBtn)   saveBtn.style.display = '';

  // Реактивируем поля
  if (taskTitleInput) taskTitleInput.disabled = false;
  if (taskStartTime)  taskStartTime.disabled = false;
  if (taskEndTime)    taskEndTime.disabled = false;
  if (weightInput)    weightInput.disabled = false;
  if (estimateInput)  estimateInput.disabled = false;

  if (taskTitleInput) taskTitleInput.value = '';
  const hour = startHour != null ? startHour : 9;
  if (taskStartTime) taskStartTime.value = `${String(hour).padStart(2, '0')}:00`;
  if (taskEndTime)   taskEndTime.value = `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`;

  const assignable = getAssignableEmployeesForCurrentUser();
  modalState.employeeIds = currentEmployee === ALL_EMPLOYEES
    ? assignable.slice()
    : [currentEmployee].filter(id => assignable.includes(id));

  renderEmployeeDropdown();
  updateEmployeeSelectLabel();
  closeEmployeeDropdown();

  if (regularDeadline) regularDeadline.value = '18:00';
  if (regularStart)    regularStart.value = '';
  if (periodStartInput) periodStartInput.value = toDateKeyValue(new Date());
  if (periodEndInput)   periodEndInput.value = '';
  if (periodEndless)    periodEndless.checked = true;
  renderWeekdays();
  if (weightInput)   weightInput.value = 3;
  if (estimateInput) estimateInput.value = 30;

  updateTypeUI();
  updatePoolUI();
  updateImportantUI();

  if (modalOverlay) modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (window.innerWidth > 640 && taskTitleInput) {
    setTimeout(() => taskTitleInput.focus(), 50);
  }
}

// ============================================================
// СОХРАНЕНИЕ (всё валидируется ещё раз на сервере)
// ============================================================
let saving = false;
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    if (saving) return;
    const text = (taskTitleInput.value || '').trim();
    if (!text) {
      taskTitleInput.focus();
      taskTitleInput.style.borderColor = '#EF4444';
      setTimeout(() => taskTitleInput.style.borderColor = '', 1500);
      return;
    }

    const weight = Math.max(1, Math.min(10,
      parseInt(weightInput ? weightInput.value : '3', 10) || 1));
    const estimate = Math.max(1,
      parseInt(estimateInput ? estimateInput.value : '30', 10) || 30);

    let action, payload;

    // ---------- EDIT ----------
    if (modalState.mode === 'edit' && modalState.instance) {
      const inst = modalState.instance;
      const task = tasks[inst.task_id];
      if (task && task.type === TASK_TYPE.REGULAR) return;

      const start = taskStartTime.value || null;
      const end   = taskEndTime.value || null;
      if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
        showAlert('Время окончания должно быть позже начала');
        return;
      }
      const dateKey = (inst.planned_start || inst.planned_end || `${modalState.date}T00:00`).slice(0, 10);
      action = 'task.update';
      payload = {
        instanceId: inst.id, title: text, weight, estimate,
        important: modalState.important, color: modalState.selectedColor,
        date: dateKey, startTime: start, endTime: end,
      };
    } else if (modalState.type === TASK_TYPE.REGULAR) {
      // ---------- CREATE: регулярная ----------
      const deadlineTime = regularDeadline ? regularDeadline.value : '';
      const startTime = regularStart ? regularStart.value : '';
      if (!deadlineTime) { showAlert('Укажите время дедлайна (ЧЧ:ММ)'); return; }
      if (startTime && timeToMinutes(startTime) >= timeToMinutes(deadlineTime)) {
        showAlert('Время начала должно быть строго раньше времени дедлайна');
        return;
      }
      if (modalState.weekdays.length === 0) {
        showAlert('Выберите хотя бы один день недели');
        return;
      }
      const periodStart = (periodStartInput && periodStartInput.value) || toDateKeyValue(new Date());
      const endless = periodEndless ? periodEndless.checked : true;
      const periodEnd = endless ? null : ((periodEndInput && periodEndInput.value) || null);
      if (!endless && !periodEnd) {
        showAlert('Укажите дату окончания или отметьте «Бессрочно»');
        return;
      }
      if (periodEnd && periodEnd < periodStart) {
        showAlert('Дата окончания не может быть раньше даты начала');
        return;
      }
      if (!modalState.isPool && modalState.employeeIds.length === 0) {
        showAlert('Выберите исполнителя или поставьте флаг «В пул»');
        return;
      }
      action = 'task.create';
      payload = {
        type: 'regular', title: text, weight, estimate,
        important: modalState.important, color: modalState.selectedColor,
        isPool: modalState.isPool, employeeIds: modalState.employeeIds.slice(),
        weekdays: modalState.weekdays.slice(), deadlineTime,
        startTime: startTime || null, periodStart, periodEnd,
      };
    } else {
      // ---------- CREATE: разовая ----------
      const start = taskStartTime.value || null;
      const end   = taskEndTime.value || null;
      if (!end) { showAlert('Укажите время дедлайна'); return; }
      if (start && timeToMinutes(end) <= timeToMinutes(start)) {
        showAlert('Время окончания должно быть позже начала');
        return;
      }
      if (new Date(`${modalState.date}T${end}:00`).getTime() <= Date.now()) {
        showAlert('Дедлайн должен быть в будущем');
        return;
      }
      if (!modalState.isPool && modalState.employeeIds.length === 0) {
        showAlert('Выберите хотя бы одного сотрудника или поставьте флаг «В пул»');
        return;
      }
      action = 'task.create';
      payload = {
        type: 'single', title: text, weight, estimate,
        important: modalState.important, color: modalState.selectedColor,
        isPool: modalState.isPool, employeeIds: modalState.employeeIds.slice(),
        date: modalState.date, startTime: start, endTime: end,
      };
    }

    saving = true;
    saveBtn.disabled = true;
    try {
      const res = await api.request(action, payload);
      if (!res.ok) {
        await showApiError(res);
        if (res.error !== 'conflict' && res.error !== 'bad_request') refreshFromServer();
        return;                       // модалку не закрываем — пользователь может поправить данные
      }
      closeModal();
      const warnings = (res.data && res.data.warnings) || [];
      if (warnings.length) {
        await showAlert('Задача создана, но есть пересечения (регулярная задача имеет приоритет):\n\n• ' +
          warnings.join('\n• '));
      }
      refreshFromServer();
    } finally {
      saving = false;
      saveBtn.disabled = false;
    }
  });
}

// ============================================================
// ВЫБОР ЦВЕТА
// ============================================================
function renderColorPicker(container, getValue, setValue) {
  if (!container) return;
  container.innerHTML = '';
  COLORS.forEach(c => {
    const opt = document.createElement('div');
    opt.className = 'color-option' + (c.value === getValue() ? ' selected' : '');
    opt.style.background = c.value;
    opt.title = c.name;
    opt.addEventListener('click', () => {
      setValue(c.value);
      renderColorPicker(container, getValue, setValue);
    });
    container.appendChild(opt);
  });
}

function renderTaskColorPicker() {
  renderColorPicker(document.getElementById('colorPicker'),
    () => modalState.selectedColor, v => { modalState.selectedColor = v; });
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    if (!modalState.instance) return;
    deleteInstance(modalState.instance.id);
    closeModal();
  });
}

// ============================================================
// ЗАКРЫТИЕ
// ============================================================
function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  modalState.instance = null;
  closeEmployeeDropdown();
}

if (cancelBtn)      cancelBtn.addEventListener('click', closeModal);
if (modalCloseBtn)  modalCloseBtn.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('open')) closeModal();
});

// ============================================================
// КНОПКА «НОВАЯ ЗАДАЧА»
// ============================================================
const addTaskBtn = document.getElementById('addTaskBtn');
if (addTaskBtn) {
  addTaskBtn.addEventListener('click', () => {
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

    if (currentEmployee !== ALL_EMPLOYEES) {
      const duration = 60;
      let slotStart = targetHour * 60;
      if (findOverlappingInstance(currentEmployee, targetDate,
          minutesToTime(slotStart), minutesToTime(slotStart + duration), null)) {
        const free = findFreeSlot(currentEmployee, targetDate, slotStart, duration, null);
        if (free !== null) slotStart = free;
      }
      targetHour = Math.floor(slotStart / 60);
    }

    openTaskModal({ mode: 'create', date: targetDate, startHour: targetHour });
  });
}