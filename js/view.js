// ============================================================
// ПЕРЕКЛЮЧЕНИЕ ВИДОВ
// Требует, чтобы renderGanttView и renderDeadlinesView были уже определены
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
  const poolViewVisible = viewMode.events && isEmployee();
  const poolPanel = document.getElementById('poolTasksPanel');
  if (poolPanel) poolPanel.style.display = poolViewVisible ? '' : 'none';
  if (poolViewVisible) renderPoolTasks();

  if (viewMode.events && !viewMode.deadlines) {
    if (currentEmployee === 0) {                                  // 0 = «Все»
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

// Логика тумблеров:
// - если активен только этот → переключаемся на противоположный
// - если активны оба → выключаем кликнутый
// - если этот выключен → включаем
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