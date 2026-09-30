// ============================================================
// ИДЕНТИФИКАЦИЯ ПОЛЬЗОВАТЕЛЯ
//
// Боевой режим: строка window.WebApp.initData (MAX Bridge) уходит на сервер как есть, сервер сам
// проверяет подпись (hash) по токену бота и определяет пользователя. Объекты вроде initDataUnsafe
// на клиенте НЕ используются — им нельзя доверять.
//
// Если Bridge недоступен, initData можно взять из URL-фрагмента: index.html#WebAppData=...
//
// Локальная разработка (ТОЛЬКО с DEV_AUTH=true на бэкенде): index.html?dev=1&user=N
//   1 — Иван Петров (владелец)      2 — Анна Смирнова (администратор)
//   3 — Сергей Иванов (администратор) 4 — Елена Петрова (сотрудник)
//   5 — Дмитрий Козлов (сотрудник)
// ============================================================
const DEV_MODE = new URLSearchParams(window.location.search).get('dev') === '1';

function readMaxInitData() {
  // 1) MAX Bridge
  const fromBridge = window.WebApp && window.WebApp.initData;
  if (typeof fromBridge === 'string' && fromBridge) return fromBridge;

  // 2) фрагмент URL: #WebAppData=<закодированная строка>&WebAppPlatform=...
  const fragment = window.location.hash.slice(1);
  if (fragment) {
    const params = new URLSearchParams(fragment);
    const value = params.get('WebAppData');       // URLSearchParams уже сделал первое декодирование
    if (value) return value;
  }
  return null;
}

// Возвращает то, что уйдёт серверу в поле initData: строку (боевой режим) или объект (только DEV)
function getInitData() {
  const real = readMaxInitData();
  if (real) return real;
  if (DEV_MODE) {
    return {
      query_id: 'dev',
      user: {
        id: Number(new URLSearchParams(window.location.search).get('user')) || 2,
        first_name: 'Тест', last_name: 'Пользователь', username: 'tester', language_code: 'ru', photo_url: '',
      },
      chat: {},
    };
  }
  return null;
}

// Сообщаем MAX, что приложение готово (убирает индикатор загрузки), если Bridge есть
function notifyMaxReady() {
  try {
    if (window.WebApp && typeof window.WebApp.ready === 'function') window.WebApp.ready();
  } catch (_) { /* не критично */ }
}
