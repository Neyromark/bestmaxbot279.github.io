// ============================================================
// МОДАЛКА ДЕДЛАЙНА (создание уходит на сервер через WebSocket)
// ============================================================
(function () {
  const overlay      = document.getElementById('deadlineModalOverlay');
  const closeBtn     = document.getElementById('deadlineModalCloseBtn');
  const cancelBtnDl  = document.getElementById('deadlineCancelBtn');
  const saveBtnDl    = document.getElementById('deadlineSaveBtn');
  const textInput    = document.getElementById('deadlineTextInput');
  const atInput      = document.getElementById('deadlineAtInput');
  const colorPicker  = document.getElementById('deadlineColorPicker');
  const selectiveEl  = document.getElementById('selectiveToggle');
  const selectiveCb  = document.getElementById('selectiveCheckbox');
  const selectiveIc  = document.getElementById('selectiveCheckIcon');
  const select       = document.getElementById('dlEmployeeSelect');
  const selectTrig   = document.getElementById('dlEmployeeSelectTrigger');
  const selectLabel  = document.getElementById('dlEmployeeSelectLabel');
  const selectDrop   = document.getElementById('dlEmployeeSelectDropdown');
  const addBtn       = document.getElementById('addDeadlineBtn');

  const state = { employeeIds: [], selectedColor: COLORS[0].value, selective: false };
  let saving = false;

  function renderDropdown() {
    selectDrop.innerHTML = '';
    const assignable = getAssignableEmployeesForCurrentUser();
    employeesData.filter(emp => assignable.includes(emp.id)).forEach(emp => {
      const opt = document.createElement('label');
      opt.className = 'employee-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = emp.id;
      cb.checked = state.employeeIds.includes(emp.id);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!state.employeeIds.includes(emp.id)) state.employeeIds.push(emp.id);
        } else {
          state.employeeIds = state.employeeIds.filter(id => id !== emp.id);
        }
        updateLabel();
      });
      opt.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = `${roleIcons[emp.role] || ''} ${employeeNames[emp.id]}`.trim();
      opt.appendChild(span);
      opt.addEventListener('click', e => e.stopPropagation());
      selectDrop.appendChild(opt);
    });
  }

  function updateLabel() {
    const ids = state.employeeIds;
    if (ids.length === 0) {
      selectLabel.textContent = 'Выберите сотрудников';
      selectLabel.classList.add('placeholder');
      return;
    }
    selectLabel.classList.remove('placeholder');
    selectLabel.textContent = ids.length <= 2
      ? ids.map(id => employeeNames[id] || id).join(', ')
      : `Выбрано: ${ids.length}`;
  }

  const closeDropdown = () => select.classList.remove('open');
  selectTrig.addEventListener('click', e => { e.stopPropagation(); select.classList.toggle('open'); });
  document.addEventListener('click', e => { if (!select.contains(e.target)) closeDropdown(); });

  function renderColors() {
    renderColorPicker(colorPicker, () => state.selectedColor, v => { state.selectedColor = v; });
  }

  function updateSelectiveUI() {
    selectiveEl.classList.toggle('active', state.selective);
    selectiveCb.style.background = state.selective ? 'var(--max-gradient)' : 'white';
    selectiveCb.style.borderColor = state.selective ? 'transparent' : '#C9B8FF';
    selectiveIc.style.display = state.selective ? 'block' : 'none';
    selectiveIc.style.color = 'white';
  }
  selectiveEl.addEventListener('click', () => { state.selective = !state.selective; updateSelectiveUI(); });

  function open() {
    if (!canManageDeadlines()) return;
    const assignable = getAssignableEmployeesForCurrentUser();
    state.employeeIds = currentEmployee === ALL_EMPLOYEES
      ? assignable.slice()
      : [currentEmployee].filter(id => assignable.includes(id));
    state.selectedColor = COLORS[0].value;
    state.selective = false;

    const def = new Date(Date.now() + 24 * 60 * 60 * 1000);
    def.setMinutes(0, 0, 0);
    atInput.value = toDatetimeLocalValue(def);
    textInput.value = '';

    renderDropdown();
    updateLabel();
    closeDropdown();
    renderColors();
    updateSelectiveUI();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.innerWidth > 640) setTimeout(() => textInput.focus(), 50);
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    closeDropdown();
  }

  cancelBtnDl.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  saveBtnDl.addEventListener('click', async () => {
    if (saving) return;
    const text = textInput.value.trim();
    if (!text) {
      textInput.focus();
      textInput.style.borderColor = '#EF4444';
      setTimeout(() => textInput.style.borderColor = '', 1500);
      return;
    }
    const at = atInput.value;
    if (!at) { await showAlert('Укажите срок дедлайна'); return; }
    if (new Date(at).getTime() <= Date.now() &&
        !await showConfirm('Указанный срок уже прошёл. Продолжить?')) return;
    if (state.employeeIds.length === 0) { await showAlert('Выберите хотя бы одного сотрудника'); return; }

    saving = true;
    saveBtnDl.disabled = true;
    try {
      const res = await api.request('deadline.create', {
        title: text, deadlineAt: at, color: state.selectedColor,
        selective: state.selective, employeeIds: state.employeeIds.slice(),
      });
      if (!res.ok) {
        await showApiError(res);
        return;
      }
      close();
      refreshFromServer();
    } finally {
      saving = false;
      saveBtnDl.disabled = false;
    }
  });

  addBtn.addEventListener('click', open);
})();
