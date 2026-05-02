/**
 * TicketVivo — events.js
 * Ahora consume backend (.NET API)
 * LocalStorage queda solo para Auth/UI.
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js → api.js → events.js
 */

'use strict';

//const API_BASE_URL = 'https://localhost:7198/api/v1';

/* ============================================================
   EVENTS
   ============================================================ */
const Events = {
  /**
   * Generar array de butacas para un sector dado.
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
    if (!response.ok) throw new Error("Error al obtener eventos");
    return await response.json();
  },

  async getById(id) {
  const [event, sectors, seats] = await Promise.all([
    fetch(`${API_BASE_URL}/Events/${id}`).then(r => {
      if (!r.ok) throw new Error("Error al obtener evento");
      return r.json();
    }),
    fetch(`${API_BASE_URL}/Sectors/event/${id}`).then(r => {
      if (!r.ok) throw new Error("Error al obtener sectores");
      return r.json();
    }),
    fetch(`${API_BASE_URL}/Seats/event/${id}`).then(r => {
      if (!r.ok) throw new Error("Error al obtener butacas");
      return r.json();
    })
  ]);

  const sectorsWithSeats = sectors.map(sector => {
    const sectorSeats = seats
      .filter(seat => Number(seat.sectorId) === Number(sector.id))
      .map((seat, index) => ({
        id: seat.id,
        row: seat.rowIdentifier ? seat.rowIdentifier.charCodeAt(0) - 64 : Math.floor(index / 10) + 1,
        col: seat.seatNumber,
        rowIdentifier: seat.rowIdentifier,
        seatNumber: seat.seatNumber,
        status: String(seat.status || '').toLowerCase() === 'available'
          ? SEAT.AVAILABLE
          : String(seat.status || '').toLowerCase() === 'sold'
            ? SEAT.SOLD
            : SEAT.LOCKED,
        lockedBy: null,
        lockExpiry: null,
        soldTo: null
      }));

    return {
      id: sector.id,
      name: sector.name,
      price: sector.price,
      capacity: sector.capacity,
      seats: sectorSeats
    };
  });

  return {
    id: event.id,
    name: event.name,
    date: event.eventDate,
    venue: event.venue,
    status: event.status,
    genre: event.genre || '',
    description: event.description || '',
    sectors: sectorsWithSeats
  };
},


  async getSeatsByEvent(eventId) {
    const response = await fetch(`${API_BASE_URL}/Seats/event/${eventId}`);
    if (!response.ok) throw new Error("Error al obtener butacas");
    return await response.json();
  },

  async getSectorsByEvent(eventId) {
    const response = await fetch(`${API_BASE_URL}/Sectors/event/${eventId}`);
    if (!response.ok) throw new Error("Error al obtener sectores");
    return await response.json();
  },

  async create(data) {
    const response = await fetch(`${API_BASE_URL}/Events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al crear evento");
    return await response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/Events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar evento");
    return await response.json();
  },

  async deleteEvent(id) {   // 👈 mejor usar deleteEvent para evitar conflictos
    const response = await fetch(`${API_BASE_URL}/Events/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Error al eliminar evento");
  },

  async getSeat(seatId) {
    const response = await fetch(`${API_BASE_URL}/Seats/${seatId}`);
    if (!response.ok) throw new Error("Error al obtener asiento");
    return await response.json();
  }
};


  /* ============================================================
   MÓDULO SEATS — Lógica de negocio de butacas
   ============================================================ */
const Seats = {
  // Inicializar datos de ejemplo en el BACKEND (solo para desarrollo/pruebas)
  async initDefaultData() {
    const events = await Events.getAll();
    if (events.length > 0) return;

    await Events.create({
      name: 'Los Fabulosos Cadillacs',
      date: '2025-08-23T21:00',
      venue: 'Teatro Gran Rex, Buenos Aires',
      description: 'Una noche única con los Cadillacs en su regreso triunfal al Gran Rex.',
      genre: 'Rock / Ska',
      sectors: [
        { name: 'Campo', rows: 5, cols: 10, price: 5000 },
        { name: 'Platea', rows: 5, cols: 10, price: 8500 },
      ],
    });

    await Events.create({
      name: 'Nathy Peluso',
      date: '2025-09-12T22:00',
      venue: 'Movistar Arena, Buenos Aires',
      description: 'La artista argentina presenta su tour más ambicioso.',
      genre: 'Pop / R&B',
      sectors: [
        { name: 'General', rows: 5, cols: 10, price: 7000 },
        { name: 'VIP', rows: 5, cols: 10, price: 15000 },
      ],
    });

    await Events.create({
      name: 'Babasónicos',
      date: '2025-10-04T21:30',
      venue: 'Estadio Luna Park, Buenos Aires',
      description: 'El regreso de Babasónicos con nuevo material y clásicos.',
      genre: 'Rock',
      sectors: [
        { name: 'Cancha', rows: 5, cols: 10, price: 6000 },
        { name: 'Tribunas', rows: 5, cols: 10, price: 9500 },
      ],
    });
  },

  async lock(eventId, sectorId, seatId, username) {
    const freshSeat = await Events.getSeat(seatId);
    if (!freshSeat) return { success: false, error: 'Butaca no encontrada.' };

    const now = Date.now();
    if (freshSeat.status === SEAT.SOLD) {
      Audit.log(username, ACTION.RESERVE_FAIL, { eventId, sectorId, seatId, reason: 'already_sold' });
      return { success: false, error: 'Esta butaca ya fue vendida.' };
    }

    if (freshSeat.status === SEAT.LOCKED && freshSeat.lockExpiry > now && freshSeat.lockedBy !== username) {
      Audit.log(username, ACTION.RESERVE_FAIL, { eventId, sectorId, seatId, reason: 'concurrent_lock' });
      return { success: false, error: 'Este asiento acaba de ser reservado por otro usuario.' };
    }

    const lockExpiry = now + LOCK_DURATION_MS;
    const response = await Events.updateSeat(eventId, sectorId, seatId, {
      status: SEAT.LOCKED,
      lockedBy: username,
      lockExpiry,
      soldTo: null,
    });

    Audit.log(username, ACTION.RESERVE_SUCCESS, { eventId, sectorId, seatId });
    return { success: true, lockExpiry, seat: response };
  },

  async unlock(eventId, sectorId, seatId, username) {
    const seat = await Events.getSeat(seatId);
    if (!seat || seat.status !== SEAT.LOCKED || seat.lockedBy !== username) return false;

    await Events.updateSeat(eventId, sectorId, seatId, {
      status: SEAT.AVAILABLE,
      lockedBy: null,
      lockExpiry: null,
    });

    Audit.log(username, ACTION.UNLOCK, { eventId, sectorId, seatId });
    return true;
  },

  async purchase(selections, username) {
    const response = await fetch(`${API_BASE_URL}/Purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, username }),
    });

    if (!response.ok) return { success: false, error: "Error en la compra" };
    return await response.json();
  },

  async releaseExpired() {
    // TODO: implementar endpoint en el backend
    return { count: 0 };
}
};
