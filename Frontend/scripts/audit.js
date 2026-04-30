/**
 * TicketVivo — audit.js
 * Módulo Audit: registro inmutable de auditoría.
 * Los logs SOLO se agregan, nunca se editan ni borran.
 * Depende de: constants.js, store.js
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js
 */

'use strict';

/* ============================================================
   MÓDULO AUDIT — Registro inmutable de auditoría
   Los logs SOLO se agregan, nunca se editan ni borran.
   ============================================================ */
const Audit = {
  /**
   * Registrar una acción en el log de auditoría.
   * @param {string} user     - Nombre de usuario que ejecutó la acción
   * @param {string} action   - Constante de ACTION
   * @param {Object} resource - { eventId, sectorId, seatId, ... }
   */
  log(user, action, resource = {}) {
    const entry = {
      id:        `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user,
      action,
      resource,
      timestamp: Date.now(),
    };
    // Solo append, nunca sobrescribir
    Store.transaction('auditLogs', (logs) => [...(Array.isArray(logs) ? logs : []), entry], []);
    return entry;
  },

  /** Obtener todos los logs (inmutables). */
  getLogs() {
    return Store.get('auditLogs', []);
  },
};
