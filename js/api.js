// ============================================================
// КЛИЕНТ WEBSOCKET (единственный канал связи с CurrentMiniAppBackend)
//
//   request(action, payload) → Promise<{ok, data | error, message, details}>
//   сервер сам шлёт {type:'data_changed'} при любом изменении в организации
//
// Боевой адрес — бэкенд за Caddy (TLS) на сервере: wss://84-201-180-248.sslip.io/ws.
// Страница открыта локально (localhost / 127.0.0.1 / file://) → ws://127.0.0.1:8000/ws.
// Переопределить: index.html?ws=wss://другой-адрес/ws
// ============================================================
const PROD_WS_URL = 'wss://84-201-180-248.sslip.io/ws';

const WS_URL = (() => {
  const override = new URLSearchParams(window.location.search).get('ws');
  if (override) return override;
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1') return 'ws://127.0.0.1:8000/ws';
  return PROD_WS_URL;
})();

const RequestTimeoutMs = 15000;

const api = (() => {
  let socket = null;
  let nextId = 1;
  let retry = 0;
  let closedByUs = false;
  const pending = new Map();                 // id → {resolve, timer}
  const listeners = { status: [], changed: [], ready: [], denied: [] };

  function emit(name, arg) {
    listeners[name].forEach(fn => { try { fn(arg); } catch (e) { console.error('[ws]', e); } });
  }

  function failAllPending(reason) {
    pending.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve({ ok: false, error: 'network', message: reason });
    });
    pending.clear();
  }

  function send(action, payload, extra) {
    return new Promise(resolve => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, error: 'network', message: 'Нет соединения с сервером' });
        return;
      }
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, error: 'timeout', message: 'Сервер не ответил вовремя' });
      }, RequestTimeoutMs);
      pending.set(id, { resolve, timer });
      socket.send(JSON.stringify({ id, action, payload: payload || {}, ...(extra || {}) }));
    });
  }

  async function handshake() {
    const initData = getInitData();
    if (!initData) {
      // Открыто не из MAX: подписанных данных нет, войти нельзя
      emit('status', 'error');
      closedByUs = true;
      if (socket) socket.close();
      emit('denied', 'Откройте приложение из мессенджера MAX: данные пользователя не получены.');
      emit('ready', null);
      return;
    }
    const res = await send('hello', {}, { initData });
    if (res.ok) {
      retry = 0;
      emit('status', 'online');
      emit('ready', res.data);
    } else {
      emit('status', 'error');
      console.error('[ws] hello failed', res);
      if (res.error === 'unauthorized') {
        closedByUs = true;                                       // повторять бессмысленно
        emit('denied', res.message || 'Доступ запрещён');
      }
      if (socket) socket.close();
      emit('ready', null);
    }
  }

  function connect() {
    emit('status', 'connecting');
    socket = new WebSocket(WS_URL);
    socket.addEventListener('open', handshake);
    socket.addEventListener('message', ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (_) { return; }
      if (msg.type === 'response') {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        entry.resolve(msg);
      } else if (msg.type === 'data_changed') {
        emit('changed', msg);
      }
    });
    socket.addEventListener('close', () => {
      failAllPending('Соединение потеряно');
      emit('status', 'offline');
      if (closedByUs) return;
      const delay = Math.min(15000, 500 * 2 ** retry++);
      setTimeout(connect, delay);
    });
    socket.addEventListener('error', () => { /* close придёт следом */ });
  }

  return {
    connect,
    request: send,
    on(name, fn) { listeners[name].push(fn); },
  };
})();

// Ошибки сервера показываем пользователю в центрированном диалоге
async function showApiError(res) {
  if (!res || res.ok) return;
  const text = res.message || 'Не удалось выполнить действие';
  await showAlert(res.error === 'network' || res.error === 'timeout'
    ? `${text}. Проверьте, что бэкенд запущен (${WS_URL}).` : text);
}
