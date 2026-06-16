/**
 * TicketVivo — auth.js
 * Módulo Auth: autenticación, registro y gestión de sesión de usuarios.
 * Depende de: constants.js (ADMIN_CREDENTIALS), store.js (Store)
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js
 */

'use strict';

/* ============================================================
   MÓDULO AUTH — Autenticación de usuarios
   ============================================================ */
const Auth = {
  currentUser: null,

  /** Cargar usuario de la sesión actual. */
  init() {
    this.currentUser = Store.get('currentUser', null);
  },

  /**
   * Intentar iniciar sesión.
   * @returns {{ success: boolean, error?: string }}
   */
  login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Completá usuario y contraseña.' };
    }
    // Verificar administrador hardcodeado
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      this.currentUser = ADMIN_CREDENTIALS;
      Store.set('currentUser', this.currentUser);
      return { success: true };
    }
    // Verificar usuarios registrados
    const users = Store.get('users', []);
    const match = users.find(u => u.username === username && u.password === password);
    if (match) {
      this.currentUser = match;
      Store.set('currentUser', match);
      return { success: true };
    }
    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  },

  /**
   * Registrar un nuevo usuario.
   * @returns {{ success: boolean, error?: string }}
   */
  register(username, password, email) {
    if (!username || !password || !email) {
      return { success: false, error: 'Completá todos los campos.' };
    }
    if (username.length < 3) {
      return { success: false, error: 'El usuario debe tener al menos 3 caracteres.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Ingresá un email válido.' };
    }
    if (username === ADMIN_CREDENTIALS.username) {
      return { success: false, error: 'Ese nombre de usuario no está disponible.' };
    }
    const users = Store.get('users', []);
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Ese usuario ya existe. Elegí otro.' };
    }
    const newUser = {
      id:       `user-${Date.now()}`,
      username,
      password, // Nota: en producción real se hashea
      email,
      role:     'client',
    };
    Store.set('users', [...users, newUser]);
    this.currentUser = newUser;
    Store.set('currentUser', newUser);
    return { success: true };
  },

  logout() {
    this.currentUser = null;
    Store.set('currentUser', null);
  },

  isAdmin() {
    return this.currentUser?.role === 'admin';
  },
};
