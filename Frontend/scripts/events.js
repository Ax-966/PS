/**
 * TicketVivo — events.js
 * Módulo Events: CRUD de eventos y generación automática de mapas de butacas.
 * Módulo Seats: lógica de negocio de butacas (bloqueo, concurrencia, compra, liberación).
 * Depende de: constants.js (SEAT, ACTION, LOCK_DURATION_MS), store.js (Store), audit.js (Audit)
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js → events.js
 */

'use strict';

const API_BASE_URL = 'https://localhost:7198/api/v1';

/* ============================================================
   MÓDULO EVENTS — CRUD de eventos y generación de mapas
   ============================================================ */
const Events = {
  /**
   * Generar array de butacas para un sector dado.
   * @param {string} sectorId - ID del sector
   * @param {number} rows     - Cantidad de filas
   * @param {number} cols     - Cantidad de columnas
   */
  generateSeats(sectorId, rows, cols) {
    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        seats.push({
          id:         `${sectorId}-r${r}-c${c}`,
          row:        r,
          col:        c,
          status:     SEAT.AVAILABLE,
          lockedBy:   null,
          lockExpiry: null,
          soldTo:     null,
        });
      }
    }
    return seats;
  },

  async getAll() {
  const response = await fetch(`${API_BASE_URL}/Events`);
  return await response.json();
},

async getById(id) {
  const response = await fetch(`${API_BASE_URL}/Events/${id}`);
  return await response.json();
},

async getSeatsByEvent(eventId) {
  const response = await fetch(`${API_BASE_URL}/Seats/event/${eventId}`);
  return await response.json();
},

async getSectorsByEvent(eventId) {
  const response = await fetch(`${API_BASE_URL}/Sectors/event/${eventId}`);
  return await response.json();
},

  create(data) {
    const id      = `evt-${Date.now()}`;
    const sectors = (data.sectors || []).map((s, i) => {
      const sectorId = `${id}-sec-${i + 1}`;
      return {
        ...s,
        id:    sectorId,
        seats: this.generateSeats(sectorId, parseInt(s.rows) || 5, parseInt(s.cols) || 10),
      };
    });
    const event = {
      id,
      name:        data.name,
      date:        data.date,
      venue:       data.venue,
      genre:       data.genre || '',
      description: data.description || '',
      sectors,
      createdAt:   Date.now(),
    };
    Store.transaction('events', (evts) => [...(evts || []), event], []);
    return event;
  },

  update(id, data) {
    Store.transaction('events', (evts) =>
      (evts || []).map(e => {
        if (e.id !== id) return e;
        // Regenerar sectores, preservando asientos ya reservados si las dims no cambian
        const updatedSectors = (data.sectors || []).map((s, i) => {
          const existing = e.sectors.find(es => es.id === s.id);
          if (
            existing &&
            parseInt(existing.rows) === parseInt(s.rows) &&
            parseInt(existing.cols) === parseInt(s.cols)
          ) {
            // Mantener asientos existentes, solo actualizar metadatos
            return { ...existing, name: s.name, price: s.price };
          }
          // Sector nuevo o con dimensiones cambiadas → regenerar
          const sectorId = s.id || `${id}-sec-${i + 1}-${Date.now()}`;
          return {
            ...s,
            id:    sectorId,
            seats: this.generateSeats(sectorId, parseInt(s.rows) || 5, parseInt(s.cols) || 10),
          };
        });
        return {
          ...e,
          name:        data.name,
          date:        data.date,
          venue:       data.venue,
          genre:       data.genre || '',
          description: data.description || '',
          sectors:     updatedSectors,
          updatedAt:   Date.now(),
        };
      }),
    []);
  },

  delete(id) {
    Store.transaction('events', (evts) => (evts || []).filter(e => e.id !== id), []);
  },

  /**
   * Actualizar estado de una butaca específica (usado por Seats).
   * Es una escritura directa al árbol de datos del evento.
   */
  updateSeat(eventId, sectorId, seatId, changes) {
    Store.transaction('events', (evts) =>
      (evts || []).map(e => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          sectors: e.sectors.map(s => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              seats: s.seats.map(seat =>
                seat.id === seatId ? { ...seat, ...changes } : seat
              ),
            };
          }),
        };
      }),
    []);
  },

  /** Leer estado fresco de una butaca desde localStorage. */
  getSeat(eventId, sectorId, seatId) {
    const event  = this.getById(eventId);
    if (!event) return null;
    const sector = event.sectors.find(s => s.id === sectorId);
    if (!sector) return null;
    return sector.seats.find(s => s.id === seatId) || null;
  },

  /**
   * Cargar datos de ejemplo si localStorage está vacío.
   * Crea 2 eventos con 2 sectores cada uno y 50 butacas por sector.
   */
  initDefaultData() {
    if ((Store.get('events', []) || []).length > 0) return;

    this.create({
      name:        'Los Fabulosos Cadillacs',
      date:        '2025-08-23T21:00',
      venue:       'Teatro Gran Rex, Buenos Aires',
      description: 'Una noche única con los Cadillacs en su regreso triunfal al Gran Rex. Ska, rock y toda la energía de siempre.',
      genre:       'Rock / Ska',
      sectors: [
        { name: 'Campo',  rows: 5, cols: 10, price: 5000 },
        { name: 'Platea', rows: 5, cols: 10, price: 8500 },
      ],
    });

    this.create({
      name:        'Nathy Peluso',
      date:        '2025-09-12T22:00',
      venue:       'Movistar Arena, Buenos Aires',
      description: 'La artista argentina de talla mundial presenta su tour más ambicioso. Una experiencia sensorial y musical sin igual.',
      genre:       'Pop / R&B',
      sectors: [
        { name: 'General', rows: 5, cols: 10, price: 7000 },
        { name: 'VIP',     rows: 5, cols: 10, price: 15000 },
      ],
    });

    this.create({
      name:        'Babasónicos',
      date:        '2025-10-04T21:30',
      venue:       'Estadio Luna Park, Buenos Aires',
      description: 'El regreso de Babasónicos con nuevo material y todos sus clásicos. Una noche de rock argentino en el mítico Luna Park.',
      genre:       'Rock',
      sectors: [
        { name: 'Cancha',   rows: 5, cols: 10, price: 6000 },
        { name: 'Tribunas', rows: 5, cols: 10, price: 9500 },
      ],
    });
  },
};


/* ============================================================
   MÓDULO SEATS — Lógica de negocio de butacas
   Controla bloqueo temporal, concurrencia y compras.
   ============================================================ */
const Seats = {
  /**
   * Intentar bloquear una butaca para el usuario actual.
   * Simula control de concurrencia: lee el estado FRESCO antes de actuar.
   * @returns {{ success: boolean, lockExpiry?: number, error?: string }}
   */
  lock(eventId, sectorId, seatId, username) {
    // ── Lectura fresca del estado actual (simula "SELECT FOR UPDATE") ──
    const freshSeat = Events.getSeat(eventId, sectorId, seatId);
    if (!freshSeat) {
      return { success: false, error: 'Butaca no encontrada.' };
    }

    const now = Date.now();

    if (freshSeat.status === SEAT.SOLD) {
      Audit.log(username, ACTION.RESERVE_FAIL, { eventId, sectorId, seatId, reason: 'already_sold' });
      return { success: false, error: 'Esta butaca ya fue vendida.' };
    }

    if (freshSeat.status === SEAT.LOCKED) {
      if (freshSeat.lockExpiry > now) {
        if (freshSeat.lockedBy !== username) {
          // ── CONTROL DE CONCURRENCIA: otro usuario tiene el bloqueo vigente ──
          Audit.log(username, ACTION.RESERVE_FAIL, {
            eventId, sectorId, seatId,
            reason:    'concurrent_lock',
            lockedBy:  freshSeat.lockedBy,
          });
          return {
            success: false,
            error:   'Este asiento acaba de ser reservado por otro usuario. Intentá con otro.',
          };
        }
        // El mismo usuario re-clicó una butaca ya bloqueada por él
        return { success: false, error: 'Ya tenés esta butaca en tu selección.' };
      }
      // Bloqueo expirado → puede tomarse sin conflicto
    }

    // ── Aplicar bloqueo (simula "UPDATE ... SET locked") ──
    const lockExpiry = now + LOCK_DURATION_MS;
    Events.updateSeat(eventId, sectorId, seatId, {
      status:     SEAT.LOCKED,
      lockedBy:   username,
      lockExpiry,
      soldTo:     null,
    });

    Audit.log(username, ACTION.RESERVE_SUCCESS, { eventId, sectorId, seatId });
    return { success: true, lockExpiry };
  },

  /**
   * Liberar bloqueo manualmente (el usuario cancela la selección).
   */
  unlock(eventId, sectorId, seatId, username) {
    const seat = Events.getSeat(eventId, sectorId, seatId);
    if (!seat || seat.status !== SEAT.LOCKED || seat.lockedBy !== username) return false;

    Events.updateSeat(eventId, sectorId, seatId, {
      status:     SEAT.AVAILABLE,
      lockedBy:   null,
      lockExpiry: null,
    });
    Audit.log(username, ACTION.UNLOCK, { eventId, sectorId, seatId });
    return true;
  },

  /**
   * Confirmar compra de todas las butacas seleccionadas.
   * Simula una transacción atómica: valida TODO antes de escribir.
   * Si alguna butaca no es válida, la operación completa falla.
   * @param {Array}  selections - [{ eventId, sectorId, seatId, seatLabel, price }]
   * @param {string} username
   * @returns {{ success: boolean, error?: string }}
   */
  purchase(selections, username) {
    const now = Date.now();

    // ── FASE 1: Validación completa (todo o nada) ──
    for (const sel of selections) {
      const freshSeat = Events.getSeat(sel.eventId, sel.sectorId, sel.seatId);
      if (!freshSeat) {
        return { success: false, error: `Butaca no encontrada: ${sel.seatLabel}.` };
      }
      if (freshSeat.status !== SEAT.LOCKED || freshSeat.lockedBy !== username) {
        return {
          success: false,
          error:   `La butaca ${sel.seatLabel} ya no está disponible. Hacé una nueva selección.`,
        };
      }
      if (freshSeat.lockExpiry <= now) {
        return {
          success: false,
          error:   `El tiempo de reserva de ${sel.seatLabel} expiró. Volvé a seleccionarla.`,
        };
      }
    }

    // ── FASE 2: Escritura atómica ──
    for (const sel of selections) {
      Events.updateSeat(sel.eventId, sel.sectorId, sel.seatId, {
        status:     SEAT.SOLD,
        lockedBy:   null,
        lockExpiry: null,
        soldTo:     username,
      });
      Audit.log(username, ACTION.PURCHASE, {
        eventId:  sel.eventId,
        sectorId: sel.sectorId,
        seatId:   sel.seatId,
        price:    sel.price,
      });
    }

    return { success: true };
  },

  /**
   * Proceso en segundo plano: libera butacas con bloqueo expirado.
   * Ejecutado por setInterval → simula un worker/cron job.
   * @returns {number} Cantidad de butacas liberadas
   */
  releaseExpired() {
    const now    = Date.now();
    const events = Events.getAll();
    let   count  = 0;

    events.forEach(event => {
      if (!event.sectors || !Array.isArray(event.sectors)) return;
      event.sectors.forEach(sector => {
        if (!sector.seats || !Array.isArray(sector.seats)) return;
        sector.seats.forEach(seat => {
          if (seat.status === SEAT.LOCKED && seat.lockExpiry <= now) {
            Events.updateSeat(event.id, sector.id, seat.id, {
              status:     SEAT.AVAILABLE,
              lockedBy:   null,
              lockExpiry: null,
            });
            Audit.log(seat.lockedBy || 'system', ACTION.RELEASE, {
              eventId:  event.id,
              sectorId: sector.id,
              seatId:   seat.id,
              reason:   'timeout_expired',
            });
            count++;
          }
        });
      });
    });

    return count;
  },
};