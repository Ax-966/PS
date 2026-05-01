/**
 * TicketVivo — main.js
 * Punto de entrada de la aplicación.
 * Orquesta la inicialización de todos los módulos en el orden correcto
 * y configura los listeners del formulario de autenticación.
 * Depende de: todos los módulos anteriores (debe cargarse último).
 *
 * ORDEN DE CARGA:
 *   constants.js → store.js → audit.js → auth.js → events.js → ui.js → main.js
 */

'use strict';

/* ============================================================
   PUNTO DE ENTRADA — Inicialización de la aplicación
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Cargar tema guardado (antes de mostrar cualquier cosa)
  const savedTheme = Store.get('theme', 'dark');
  document.documentElement.dataset.theme = savedTheme;

  // 2. Inicializar datos de ejemplo en localStorage si está vacío
  //Events.initDefaultData();

  // 3. Verificar sesión activa
  Auth.init();

  if (Auth.currentUser) {
    // ── Usuario ya autenticado: mostrar la app ──
    document.getElementById('auth-overlay')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    UI.init();
  } else {
    // ── No autenticado: mostrar pantalla de login ──
    document.getElementById('auth-overlay')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
    _setupAuthListeners();
  }

  // 4. Iniciar proceso de liberación automática en segundo plano
  Background.start();
});


/**
 * Configurar listeners del formulario de autenticación.
 * Se llama solo cuando el usuario NO está autenticado.
 */
function _setupAuthListeners() {
  // Cambio de tab login / registro
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('login-form')?.classList.toggle('hidden', target !== 'login');
      document.getElementById('register-form')?.classList.toggle('hidden', target !== 'register');
      // Limpiar errores al cambiar de tab
      document.getElementById('login-error').textContent    = '';
      document.getElementById('register-error').textContent = '';
    });
  });

  // ── LOGIN ──
  const doLogin = () => {
    const username = document.getElementById('login-username')?.value.trim() || '';
    const password = document.getElementById('login-password')?.value || '';
    const errorEl  = document.getElementById('login-error');
    errorEl.textContent = '';

    const result = Auth.login(username, password);
    if (result.success) {
      document.getElementById('auth-overlay')?.classList.add('hidden');
      document.getElementById('app')?.classList.remove('hidden');
      UI.init();
    } else {
      errorEl.textContent = result.error;
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  };

  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  ['login-username', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // ── REGISTRO ──
  const doRegister = () => {
    const username = document.getElementById('reg-username')?.value.trim() || '';
    const email    = document.getElementById('reg-email')?.value.trim()    || '';
    const password = document.getElementById('reg-password')?.value        || '';
    const errorEl  = document.getElementById('register-error');
    errorEl.textContent = '';

    const result = Auth.register(username, password, email);
    if (result.success) {
      document.getElementById('auth-overlay')?.classList.add('hidden');
      document.getElementById('app')?.classList.remove('hidden');
      UI.init();
    } else {
      errorEl.textContent = result.error;
    }
  };

  document.getElementById('btn-register')?.addEventListener('click', doRegister);
  document.getElementById('reg-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doRegister();
  });
}
