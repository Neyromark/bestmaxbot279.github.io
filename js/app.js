// ============================================================
// ТОЧКА ВХОДА: WebSocket + реальное время
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

// Полноэкранная заглушка вместо календаря, если MAX-данные не подтверждены
function showAccessDenied(message) {
  const app = document.querySelector('.calendar-app');
  if (!app) return;
  app.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'all-hint visible';
  box.innerHTML = '<div class="all-hint-icon">🔒</div><div class="all-hint-title">Доступ закрыт</div>' +
                  '<div class="all-hint-text"></div>';
  box.querySelector('.all-hint-text').textContent = message;      // textContent: без HTML-инъекций
  app.appendChild(box);
}

function renderConnectionStatus(state) {
  const el = document.getElementById('connStatus');
  if (!el) return;
  const map = {
    online:     ['● онлайн',           'online'],
    connecting: ['● подключение…',     'connecting'],
    offline:    ['● нет связи',        'offline'],
    error:      ['● ошибка входа',     'offline'],
  };
  const [text, cls] = map[state] || map.offline;
  el.textContent = text;
  el.className = `conn-status ${cls}`;
}

// Подставить свежие данные и перерисовать, не сбрасывая выбор пользователя
function applyAndRender(data, { firstTime = false } = {}) {
  applySnapshot(data);

  const visible = getVisibleEmployeesForCurrentUser();
  if (firstTime) {
    currentEmployee = currentUser.id;
  } else if (currentEmployee !== ALL_EMPLOYEES && !visible.includes(currentEmployee)) {
    // выбранный сотрудник больше не виден (сменилась роль/удалён) → «Все» или сам пользователь
    currentEmployee = isEmployee() ? currentUser.id : ALL_EMPLOYEES;
  }
  if (isEmployee() && currentEmployee === ALL_EMPLOYEES) currentEmployee = currentUser.id;

  renderUserStatus();
  renderEmployeesBar();
  refreshActiveView();
}

// Запрос свежего снимка; параллельные вызовы схлопываются в один
let refreshInFlight = false;
let refreshQueued = false;
async function refreshFromServer(opts) {
  if (refreshInFlight) { refreshQueued = true; return; }
  refreshInFlight = true;
  try {
    const res = await api.request('snapshot');
    if (res.ok) applyAndRender(res.data, opts);
    else console.error('[snapshot]', res);
  } finally {
    refreshInFlight = false;
    if (refreshQueued) { refreshQueued = false; refreshFromServer(); }
  }
}

let started = false;
function startUi(snapshot) {
  started = true;
  currentWeekStart = getStartOfWeek(new Date());
  applyAndRender(snapshot, { firstTime: true });
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
    if (viewMode.events && !viewMode.deadlines && currentEmployee !== ALL_EMPLOYEES) {
      const today = document.querySelector('.day-column.today');
      if (today) renderGanttView();
    } else if (!(viewMode.events && !viewMode.deadlines)) {
      renderDeadlinesView();
    }
  }, 60000);
}

function init() {
  renderConnectionStatus('connecting');

  api.on('status', renderConnectionStatus);
  api.on('denied', showAccessDenied);
  api.on('ready', snapshot => {
    if (!snapshot) return;
    // первое подключение — стартуем UI; переподключение — просто обновляем данные
    if (!started) startUi(snapshot);
    else applyAndRender(snapshot);
  });
  // Любое изменение в организации (в том числе наше) → свежий снимок
  api.on('changed', () => refreshFromServer());

  notifyMaxReady();
  api.connect();
}
