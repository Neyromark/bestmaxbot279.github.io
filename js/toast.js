// ============================================================
// ЦЕНТРИРОВАННЫЕ ДИАЛОГИ
// ============================================================

const dialogQueue = [];
let activeDialog = null;

function showAlert(message) {
  return enqueueDialog('alert', message);
}

function showConfirm(message) {
  return enqueueDialog('confirm', message);
}

function enqueueDialog(type, message) {
  return new Promise(resolve => {
    dialogQueue.push({ type, message: String(message), resolve });
    showNextDialog();
  });
}

function showNextDialog() {
  if (activeDialog || dialogQueue.length === 0) return;

  const item = dialogQueue.shift();
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'app-dialog-overlay';
  overlay.innerHTML = `
    <section class="app-dialog" role="${item.type === 'alert' ? 'alertdialog' : 'dialog'}"
      aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMessage">
      <h2 class="app-dialog-title" id="appDialogTitle">${item.type === 'alert' ? 'Сообщение' : 'Подтверждение'}</h2>
      <p class="app-dialog-message" id="appDialogMessage"></p>
      <div class="app-dialog-actions"></div>
    </section>`;

  const dialog = overlay.querySelector('.app-dialog');
  const message = overlay.querySelector('.app-dialog-message');
  const actions = overlay.querySelector('.app-dialog-actions');
  message.textContent = item.message;

  const finish = result => {
    if (!activeDialog || activeDialog.overlay !== overlay) return;
    document.removeEventListener('keydown', activeDialog.onKeyDown);
    overlay.remove();
    activeDialog = null;
    item.resolve(result);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    showNextDialog();
  };

  const buttons = item.type === 'alert'
    ? [{ label: 'ОК', result: true, className: 'btn-primary' }]
    : [
        { label: 'Нет', result: false, className: 'btn-secondary' },
        { label: 'Да', result: true, className: 'btn-primary' },
      ];

  buttons.forEach(({ label, result, className }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`;
    button.textContent = label;
    button.addEventListener('click', () => finish(result));
    actions.appendChild(button);
  });

  const onKeyDown = event => {
    if (event.key === 'Escape' && item.type === 'confirm') {
      finish(false);
      return;
    }
    if (event.key === 'Escape' && item.type === 'alert') {
      finish(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  activeDialog = { overlay, onKeyDown };
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeyDown);
  actions.querySelector('button:last-child').focus();
}
