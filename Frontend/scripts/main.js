/**
 * TicketVivo — main.js
 */

'use strict';

/* ============================================================
   INIT APP
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Tema
  const savedTheme = Store.get('theme', 'dark');
  document.documentElement.dataset.theme = savedTheme;

  // Usuario logueado
  Auth.init();

  if (Auth.currentUser) {

    document.getElementById('auth-overlay')
      ?.classList.add('hidden');

    document.getElementById('app')
      ?.classList.remove('hidden');

    UI.init();

  } else {

    document.getElementById('auth-overlay')
      ?.classList.remove('hidden');

    document.getElementById('app')
      ?.classList.add('hidden');

    _setupAuthListeners();
  }

  // Background jobs
  if (typeof Background !== 'undefined') {
    Background.start();
  }
});


/* ============================================================
   AUTH LISTENERS
   ============================================================ */

function _setupAuthListeners() {

  /* ============================================================
     TABS LOGIN / REGISTER
     ============================================================ */

  document.querySelectorAll('.auth-tab').forEach(tab => {

    tab.addEventListener('click', () => {

      document.querySelectorAll('.auth-tab')
        .forEach(t => t.classList.remove('active'));

      tab.classList.add('active');

      const target = tab.dataset.tab;

      document.getElementById('login-form')
        ?.classList.toggle('hidden', target !== 'login');

      document.getElementById('register-form')
        ?.classList.toggle('hidden', target !== 'register');

      // limpiar errores
      document.getElementById('login-error').textContent = '';
      document.getElementById('register-error').textContent = '';
    });
  });


  /* ============================================================
     LOGIN
     ============================================================ */

  const doLogin = async () => {

    const email =
      document.getElementById('login-email')
        ?.value.trim() || '';

    const password =
      document.getElementById('login-password')
        ?.value || '';

    const errorEl =
      document.getElementById('login-error');

    errorEl.textContent = '';

    const result = await Auth.login(email, password);

    if (result.success) {

      document.getElementById('auth-overlay')
        ?.classList.add('hidden');

      document.getElementById('app')
        ?.classList.remove('hidden');

      UI.init();

    } else {

      errorEl.textContent = result.error;

      document.getElementById('login-password').value = '';

      document.getElementById('login-password')
        ?.focus();
    }
  };

  document.getElementById('btn-login')
    ?.addEventListener('click', doLogin);

  ['login-email', 'login-password'].forEach(id => {

    document.getElementById(id)
      ?.addEventListener('keydown', e => {

        if (e.key === 'Enter') {
          doLogin();
        }
      });
  });


  /* ============================================================
     REGISTER
     ============================================================ */

  const doRegister = async () => {

    const name =
      document.getElementById('reg-username')
        ?.value.trim() || '';

    const email =
      document.getElementById('reg-email')
        ?.value.trim() || '';

    const password =
      document.getElementById('reg-password')
        ?.value || '';

    const errorEl =
      document.getElementById('register-error');

    errorEl.textContent = '';

    const result =
      await Auth.register(name, email, password);

    if (result.success) {

      document.getElementById('auth-overlay')
        ?.classList.add('hidden');

      document.getElementById('app')
        ?.classList.remove('hidden');

      UI.init();

    } else {

      errorEl.textContent = result.error;
    }
  };

  document.getElementById('btn-register')
    ?.addEventListener('click', doRegister);

  [
    'reg-username',
    'reg-email',
    'reg-password'
  ].forEach(id => {

    document.getElementById(id)
      ?.addEventListener('keydown', e => {

        if (e.key === 'Enter') {
          doRegister();
        }
      });
  });
}