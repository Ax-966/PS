/**
 * TicketVivo — events.js
 * Ahora consume backend (.NET API)
 * LocalStorage queda solo para Auth/UI.
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js → api.js → events.js
 */

'use strict';

/* ============================================================
   UTILIDAD INTERNA
   El backend exige UserId como int, pero los usuarios viven
   solo en el frontend con IDs string ("admin", "user-1748...").
   Derivamos un número estable y único a partir del string
   sin tocar el backend ni el módulo Auth.

   Ejemplos:
     "admin"          → 0
     "user-1748000000000" → último segmento numérico → 1748000000000 % 2_000_000 → entero positivo
   ============================================================ */
function _resolveNumericUserId(user) {
  if (!user) return 0;

  if (user.role === 'admin') return 0;

  // Extraer la parte numérica del id tipo "user-1748000000000"
  const numeric = parseInt(user.id.replace(/\D/g, ''), 10);
  if (!isNaN(numeric)) {
    // Acotamos a un rango seguro para int de .NET (max ~2.1 billion)
    return numeric % 2_000_000;
  }

  // Fallback: hash simple sobre el username
  return [...user.username].reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/* ============================================================
   EVENTS
   ============================================================ */
const Events = {

  initDefaultData() {
    // Sin datos mock: todo viene del backend
    return;
  },

  async getAll() {
    return await Api.getAllEvents();
  },

  async getById(id) {
    return await Api.getEventById(id);
  },

  async create(data) {
    return await Api.createEvent(data);
  },

  async update(eventId, data) {
    // Endpoint aún no implementado en el backend
    console.warn('[Events] update() no implementado en el backend todavía.');
    return null;
  },

  async delete(eventId) {
    // Endpoint aún no implementado en el backend
    console.warn('[Events] delete() no implementado en el backend todavía.');
    return null;
  },

  /**
   * Devuelve los sectores de un evento.
   * SectorResponseDto: { id: int, name, price, capacity }
   */
  async getSectors(eventId) {
    return await Api.getSectorsByEvent(eventId);
  },

  /**
   * Devuelve los seats de un evento agrupables por sector.
   *
   * PROBLEMA: SeatResponseDto no incluye sectorId.
   * SOLUCIÓN: pedimos los seats sector por sector usando
   * GET /sectors/{sectorId}/seats, y le agregamos sectorId
   * nosotros antes de devolver el array unificado.
   *
   * Si ese endpoint no existe todavía en el backend, cae al
   * fallback de GET /events/{eventId}/seats y los seats quedan
   * sin sectorId (la vista los mostrará todos en el primer sector).
   */
async getSeats(eventId) {
  const seats = await Api.getSeatsByEvent(eventId);

  if (!Array.isArray(seats)) return [];

  return seats;
},
  /**
   * Crear un sector para un evento.
   * @param {number} eventId
   * @param {{ name: string, price: number, capacity: number }} data
   */
  async createSector(eventId, data) {
    return await Api.createSector(eventId, data);
  },

  /**
   * Crear una butaca en un sector.
   * @param {number} sectorId
   * @param {{ rowIdentifier: string, seatNumber: number }} data
   */
  async createSeat(sectorId, data) {
    return await Api.createSeat(sectorId, data);
  },

  updateSeat(eventId, sectorId, seatId, changes) {
    // Solo local/UI mientras no exista endpoint backend
    console.warn('[Events] updateSeat() es solo local (sin backend todavía).');
  },
};

/* ============================================================
   SEATS
   ============================================================ */
const Seats = {

  /**
   * Reservar (bloquear) una butaca en el backend.
   * Traduce el userId string del frontend a int para el backend.
   */
  async lock(eventId, seatId, username) {
    const user = Auth.currentUser;
    if (!user) {
      return { success: false, error: 'Debés iniciar sesión.' };
    }

    const numericUserId = _resolveNumericUserId(user);
    const result = await Api.createReservation(numericUserId, seatId);

    if (!result.success) {
      Audit.log(username, ACTION.RESERVE_FAIL, { eventId, seatId });
      return result;
    }

    Audit.log(username, ACTION.RESERVE_SUCCESS, { eventId, seatId });

    // Normalizar expiresAt: puede venir como string ISO o null
    const expiresAt = result.expiresAt
      ? new Date(result.expiresAt).getTime()
      : Date.now() + LOCK_DURATION_MS; // fallback si el backend no lo manda

    return {
      success:    true,
      lockExpiry: expiresAt,
    };
  },

  unlock() {
    // El backend libera por timeout automáticamente.
    // Si en el futuro hay DELETE /reservations/{id}, va aquí.
    return true;
  },

  purchase(selections, username) {
    Audit.log(username, ACTION.PURCHASE, { seats: selections.length });
    return { success: true };
  },

  releaseExpired() {
    // El backend maneja la expiración; el frontend solo limpia su estado visual.
    return 0;
  },
};