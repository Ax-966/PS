
'use strict';

const Auth = {
  currentUser: null,

  /* ============================================================
     INIT
     ============================================================ */

  init() {
    this.currentUser = Store.get('currentUser', null);
  },
  
  getUserId() {

  const token = this.getToken();

  if (!token) return null;

  try {

    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    return (
      payload.nameid ||
      payload.sub ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      null
    );

  } catch {

    return null;
  }
},
  /* ============================================================
     LOGIN
     ============================================================ */

  async login(email, password) {

    if (!email || !password) {
      return {
        success: false,
        error: 'Completá email y contraseña.',
      };
    }

    try {

      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      /* =========================
         ERROR LOGIN
         ========================= */

      if (!response.ok) {

        const data = await response.json().catch(() => ({}));

        return {
          success: false,
          error:
            data?.errors?.[0] ||
            'Las credenciales no son válidas.',
        };
      }

      /* =========================
         LOGIN OK
         ========================= */

      const data = await response.json();

      const role =
        _extractRoleFromToken(data.token) ||
        data.role ||
        'client';

      this.currentUser = {
        id: _extractIdFromToken(data.token),

        name: data.name,

        email: data.email,

        token: data.token,

        role,
      };

      Store.set('currentUser', this.currentUser);

      return {
        success: true,
      };

    } catch {

      return {
        success: false,
        error: 'Error de conexión con el servidor.',
      };
    }
  },

  /* ============================================================
     REGISTER
     ============================================================ */

  async register(name, email, password) {

    /* =========================
       VALIDACIONES
       ========================= */

    if (!name || !email || !password) {
      return {
        success: false,
        error: 'Completá todos los campos.',
      };
    }

    if (name.length < 3) {
      return {
        success: false,
        error: 'El nombre debe tener al menos 3 caracteres.',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Ingresá un email válido.',
      };
    }

    try {

      const response = await fetch(`${API_BASE_URL}/Auth/register`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      /* =========================
         ERROR REGISTER
         ========================= */

      if (!response.ok) {

        const data = await response.json().catch(() => ({}));

        return {
          success: false,
          error:
            data?.errors?.[0] ||
            'Error al registrar el usuario.',
        };
      }

      /* =========================
         REGISTER OK
         ========================= */

      const data = await response.json();

      const role =
        _extractRoleFromToken(data.token) ||
        data.role ||
        'client';

      this.currentUser = {
        id: _extractIdFromToken(data.token),

        name: data.name,

        email: data.email,

        token: data.token,

        role,
      };

      Store.set('currentUser', this.currentUser);

      return {
        success: true,
      };

    } catch {

      return {
        success: false,
        error: 'Error de conexión con el servidor.',
      };
    }
  },

  /* ============================================================
     LOGOUT
     ============================================================ */

  logout() {

    this.currentUser = null;

    Store.set('currentUser', null);
  },

  /* ============================================================
     HELPERS
     ============================================================ */

  isAuthenticated() {
    return !!this.currentUser;
  },

  isAdmin() {
    return this.currentUser?.role === 'admin';
  },

  isClient() {
    return this.currentUser?.role === 'client';
  },

  getToken() {
    return this.currentUser?.token || null;
  },

  getUser() {
    return this.currentUser;
  },
};


/* ============================================================
   JWT HELPERS
   ============================================================ */

/**
 * Extraer ROLE desde JWT (.NET Identity)
 */
function _extractRoleFromToken(token) {

  try {

    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    const role =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] ||
      payload['Role'];

    return typeof role === 'string'
      ? role.toLowerCase()
      : null;

  } catch {

    return null;
  }
}


/**
 * Extraer USER ID desde JWT
 */
function _extractIdFromToken(token) {

  try {

    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    return (
      payload['sub'] ||
      payload['Sub'] ||
      null
    );

  } catch {

    return null;
  }
}