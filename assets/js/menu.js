// menu.js — логіка меню: кнопка «Назад» і підтвердження виходу

document.addEventListener('DOMContentLoaded', () => {

  // ---- Кнопки «Назад» (data-back) --------------------------------
  // Якщо гравець прийшов з іншої сторінки гри — повертаємо його туди
  // (наприклад, з налаштувань назад у бій). Інакше працює звичайне
  // посилання з href (запасний варіант — головне меню).
  document.querySelectorAll('[data-back]').forEach(link => {
    link.addEventListener('click', event => {
      const cameFromGame = document.referrer && history.length > 1;
      if (cameFromGame) {
        event.preventDefault();
        history.back();
      }
    });
  });

  // ---- Вихід з гри (тільки на головному меню) ---------------------
  const exitBtn = document.getElementById('exit-btn');
  const dialog  = document.getElementById('exit-dialog');
  if (!exitBtn || !dialog) return;

  const text    = document.getElementById('exit-text');
  const actions = document.getElementById('exit-actions');

  exitBtn.addEventListener('click', () => dialog.showModal());

  document.getElementById('exit-no').addEventListener('click', () => dialog.close());

  document.getElementById('exit-yes').addEventListener('click', () => {
    // Браузер дозволяє закрити вкладку тільки якщо її відкрив скрипт.
    // window.close() нічого не повертає, тому перевіряємо window.closed
    // трохи згодом: якщо вікно не закрилось (телефон, вікно start.exe) —
    // показуємо прощання і кнопку повернення в меню.
    text.textContent = 'Дякуємо за гру!';
    actions.hidden = true;
    window.close();
    setTimeout(() => {
      if (window.closed) return;
      text.textContent = 'Дякуємо за гру! Тепер можна закрити вікно або застосунок.';
      document.getElementById('exit-yes').hidden = true;
      document.getElementById('exit-no').textContent = 'Повернутися в меню';
      actions.hidden = false;
    }, 300);
  });

  // Після «Повернутися в меню» діалог знову має питати «Вийти з гри?»
  dialog.addEventListener('close', () => {
    text.textContent = 'Вийти з гри?';
    document.getElementById('exit-yes').hidden = false;
    document.getElementById('exit-no').textContent = 'Ні, залишитись';
    actions.hidden = false;
  });
});
