/**
 * TicketVivo — store.js
 * Módulo Store: wrapper de localStorage que simula operaciones de base de datos.
 * Depende de: constants.js (ninguna constante directa, pero debe cargarse antes)
 *
 * ORDEN DE CARGA: constants.js → store.js
 */

'use strict';

/* ============================================================
   MÓDULO STORE — Wrapper de localStorage
   Simula operaciones de base de datos con transacciones atómicas.
   ============================================================ */
const Store = {
  /**
   * Leer un valor. Devuelve `fallback` si no existe o hay error de parseo.
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Guardar un valor serializado.
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('[Store] Error guardando en localStorage:', err);
    }
  },

  /**
   * Transacción atómica: leer → transformar → escribir.
   * Simula el patrón "read-modify-write" de bases de datos reales.
   * @param {string}   key       - Clave de localStorage
   * @param {Function} transform - (currentValue) => newValue
   * @param {*}        fallback  - Valor inicial si la clave no existe
   * @returns El nuevo valor guardado
   */
  transaction(key, transform, fallback = null) {
    const current = this.get(key, fallback);
    const updated  = transform(current);
    this.set(key, updated);
    return updated;
  },
};