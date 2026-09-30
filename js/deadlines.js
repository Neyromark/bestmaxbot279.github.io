// ============================================================
// ДЕДЛАЙНЫ: 3 КОЛОНКИ, ПРИНЯТИЕ, УДАЛЕНИЕ
// ============================================================

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

  if (currentEmployee === 0) {                                    // 0 = «Все»
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

  if (canManageDeadlines()) {
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-deadline-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Удалить дедлайн';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await showConfirm(`Удалить дедлайн «${dl.text}»?`)) {
        deleteDeadline(dl.id);
      }
    });
    item.appendChild(delBtn);
  }

  return item;
}

function buildEventItem(event) {
  const t = event.task;
  const nowMs = Date.now();
  const startMs = taskStartMs(t);
  const endMs = taskEndMs(t);

  const item = document.createElement('div');
  item.className = 'event-item';
  item.style.color = t.color || '#7B9EFF';

  const marker = document.createElement('span');
  marker.className = 'ev-marker';
  marker.textContent = (event.completedAt || (!event.startedAt && endMs < nowMs)) ? '✓' : '☐';
  item.appendChild(marker);

  const body = document.createElement('div');
  body.className = 'ev-body';

  const time = document.createElement('span');
  time.className = 'ev-time';
  const dateLabel = formatDateKey(new Date(startMs)).split('-').reverse().slice(0, 2).join('.');
  time.textContent = t.startTime
    ? `${dateLabel} ${t.startTime}–${t.endTime}`
    : `${dateLabel} · до ${t.endTime}`;
  body.appendChild(time);

  const text = document.createElement('span');
  text.className = 'ev-text';
  text.textContent = `${t.important ? '⭐ ' : ''}${t.text}`;
  body.appendChild(text);

  if (currentEmployee === 0) {                                    // 0 = «Все»
    const owner = document.createElement('span');
    owner.className = 'ev-owner';
    owner.textContent = employeeNames[event.employeeId] || event.employeeId;
    body.appendChild(owner);
  }

  item.appendChild(body);
  if (event.poolInstanceId) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'accept-deadline-btn';
    action.textContent = event.poolAvailable ? 'Взять' : 'Отказаться';
    action.addEventListener('click', eventClick => {
      eventClick.stopPropagation();
      if (event.poolAvailable) takePoolTask(event.poolInstanceId);
      else returnPoolTask(event.poolInstanceId);
    });
    item.appendChild(action);
  }
  return item;
}

function renderDeadlinesView() {
  const poolRange = ensureCurrentAndNextWeekRegularInstances();
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
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    allEvents.forEach(ev => {
      const s = taskStartMs(ev.task);
      const e = taskEndMs(ev.task);
      const isPoolRegular = !!ev.poolInstanceId;
      const limitMs = isPoolRegular
        ? new Date(`${poolRange.end}T23:59:59`).getTime()
        : nowMs + 8 * 24 * 60 * 60 * 1000;

      // 1) Отмечено выполненным (actual_end) — всегда «Сделано», даже если плановое время ещё не наступило
      if (ev.completedAt) {
        const doneMs = new Date(ev.completedAt).getTime();
        if (isNaN(doneMs) || doneMs >= nowMs - WEEK_MS || e >= nowMs - WEEK_MS) {
          eventsByStatus.done.push(ev);
        }
        return;
      }
      // 2) Начато (actual_start), но не завершено — «В процессе»
      if (ev.startedAt) {
        eventsByStatus.in_progress.push(ev);
        return;
      }
      // 3) Иначе — по плановому времени
      if (e <= nowMs) {
        if (e >= nowMs - WEEK_MS) eventsByStatus.done.push(ev);
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
        dlList.appendChild(buildDeadlineItem(dl, status === 'done' && !dl.completedAt));
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

async function acceptDeadline(id) {
  const dl = deadlines.find(d => d.id === id);
  if (!dl) return;
  if (!dl.availableForIds || !dl.availableForIds.includes(currentUser.id)) return;
  if (!await showConfirm(`Принять дедлайн «${dl.text}»?`)) return;
  const res = await api.request('deadline.accept', { id });
  if (!res.ok) {
    await showApiError(res);
    refreshFromServer();      // возможно, его уже принял другой
  }
}

async function deleteDeadline(id) {
  const res = await api.request('deadline.delete', { id });
  if (!res.ok) {
    await showApiError(res);
    refreshFromServer();
  }
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