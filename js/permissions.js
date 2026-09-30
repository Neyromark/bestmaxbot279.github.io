// ============================================================
// ПРАВА ДОСТУПА И ФИЛЬТРАЦИЯ ПО РОЛЯМ
// ============================================================

function canEditTasks() {
  return currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin');
}
function canManageDeadlines() {
  return currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin');
}

// Себя + строго ниже рангом
// Списки приходят с сервера (он же проверяет права при каждом действии).
function getVisibleEmployeesForCurrentUser() {
  return serverVisibleIds.slice();
}

// Кому текущий пользователь может НАЗНАЧАТЬ задачи/дедлайны.
//   Owner  → всем, включая себя
//   Admin  → только строго ниже (без себя)
//   Employee → никому (не может создавать)
function getAssignableEmployeesForCurrentUser() {
  return serverAssignableIds.slice();
}

function isEmployee() {
  return !!currentUser && currentUser.role === 'employee';
}

function canAssignTo(id) {
  return getAssignableEmployeesForCurrentUser().includes(id);
}

function getVisibleEmployees() {
  const visible = getVisibleEmployeesForCurrentUser();
  if (currentEmployee === ALL_EMPLOYEES) return visible;
  if (!visible.includes(currentEmployee)) return [];
  return [currentEmployee];
}

function getDeadlinesFiltered() {
  if (isEmployee()) {
    return deadlines.filter(dl => {
      if (dl.assignedUserId === currentUser.id) return true;
      if (dl.availableForIds && dl.availableForIds.includes(currentUser.id)) return true;
      return false;
    });
  }

  const visible = getVisibleEmployeesForCurrentUser();

  if (currentEmployee === ALL_EMPLOYEES) {
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
  const poolRange = getCurrentAndNextWeekDateRange();
  getVisibleEmployees().forEach(employeeId => {
    instances
      .filter(instance =>
        instance.assignee === employeeId &&
        instance.planned_end &&
        (instance.planned_start ||
          (tasks[instance.task_id]?.is_pool && tasks[instance.task_id]?.type === TASK_TYPE.REGULAR))
      )
      .forEach(instance => {
        const task = tasks[instance.task_id];
        const isPoolRegular = task?.is_pool && task.type === TASK_TYPE.REGULAR;
        const date = (instance.planned_start || instance.planned_end).slice(0, 10);
        if (isPoolRegular && (date < poolRange.start || date > poolRange.end)) return;

        result.push({
          task: {
            date,
            startTime: instance.planned_start ? instance.planned_start.slice(11, 16) : null,
            endTime: instance.planned_end.slice(11, 16),
            text: instance.title,
            color: instance.color,
            important: instance.important ?? tasks[instance.task_id]?.important ?? false,
          },
          employeeId,
          poolInstanceId: isPoolRegular ? instance.id : null,
          poolAvailable: false,
          completedAt: instance.actual_end || null,
          startedAt: instance.actual_start || null,
        });
      });
  });

  if (isEmployee()) {
    instances
      .filter(instance => {
        const task = tasks[instance.task_id];
        if (!task?.is_pool || task.type !== TASK_TYPE.REGULAR || instance.assignee != null ||
            !instance.planned_end) return false;
        const date = (instance.planned_start || instance.planned_end).slice(0, 10);
        return date >= poolRange.start && date <= poolRange.end;
      })
      .forEach(instance => {
        const date = (instance.planned_start || instance.planned_end).slice(0, 10);
        result.push({
          task: {
            date,
            startTime: instance.planned_start ? instance.planned_start.slice(11, 16) : null,
            endTime: instance.planned_end.slice(11, 16),
            text: instance.title,
            color: instance.color,
            important: instance.important ?? tasks[instance.task_id]?.important ?? false,
          },
          employeeId: currentUser.id,
          poolInstanceId: instance.id,
          poolAvailable: true,
          completedAt: null,
          startedAt: null,
        });
      });
  }
  return result;
}

function getDeadlineStatus(dl, nowMs) {
  if (dl.completedAt) return 'done';           // отмечен выполненным (например, ботом)
  const deadlineMs = new Date(dl.deadlineAt).getTime();
  if (deadlineMs < nowMs) return 'done';
  if (dl.assignedUserId) return 'in_progress';
  return 'todo';
}

function canAcceptDeadline(dl) {
  if (!dl.availableForIds || dl.assignedUserId) return false;
  if (!dl.availableForIds.includes(currentUser.id)) return false;
  if (currentEmployee !== ALL_EMPLOYEES && currentEmployee !== currentUser.id) return false;
  return true;
}