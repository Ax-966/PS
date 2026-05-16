
'use strict';

const API_BASE_URL = 'https://localhost:7198/api/v1';

/* ============================================================
   EVENTS
   ============================================================ */
const Events = {

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
      .map((seat, index) => {

        const status = String(seat.status || '').toLowerCase();

        let normalizedStatus = SEAT.AVAILABLE;

        if (status === 'sold') {
          normalizedStatus = SEAT.SOLD;
        }
        else if (status === 'locked') {
          normalizedStatus = SEAT.LOCKED;
        }

        return {
          id: seat.id,

          row: Math.floor(index / sector.cols) + 1,

          col: (index % sector.cols) + 1,

          rowIdentifier: seat.rowIdentifier,
          seatNumber: seat.seatNumber,

          status: normalizedStatus,

          lockedBy: null,
          lockExpiry: null,
          soldTo: null
        };
      });

    return {
      id: sector.id,
      name: sector.name,
      price: sector.price,
      capacity: sector.capacity,
      cols: sector.cols, 
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
   RESERVATIONS
   ============================================================ */
const Reservations = {

  async create(userId, seatId) {

    const token = Auth.getToken();

    const response = await fetch(
      `${API_BASE_URL}/Reservations`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        },

        body: JSON.stringify({
          userId,
          seatId,
        }),
      }
    );

    if (!response.ok) {

      let errorData = {};

      try {
        errorData = await response.json();
      } catch {}

      const error = new Error(
        errorData?.message ||
        'Error al crear la reserva.'
      );

      error.status = response.status;

      throw error;
    }

    return await response.json();
  },
   async confirm(
    reservationId,
    userId
  ) {

    const token =
      Auth.getToken();

    const response = await fetch(

      `${API_BASE_URL}/Reservations/${reservationId}/confirm`,

      {

        method: 'POST',

        headers: {

          'Content-Type':
            'application/json',

          ...(token && {
            Authorization:
              `Bearer ${token}`,
          }),
        },

        body: JSON.stringify(userId),
      }
    );

    if (!response.ok) {

      let errorData = {};

      try {
        errorData =
          await response.json();
      }
      catch {}

      const error = new Error(

        errorData?.message ||

        'Error al confirmar compra.'
      );

      error.status =
        response.status;

      throw error;
    }

    return await response.json();
  },
 async cancel(reservationId, userId) {
    const token = Auth.getToken();

    // userId va como Query String (?userId=...)
    const response = await fetch(
      `${API_BASE_URL}/Reservations/${reservationId}?userId=${userId}`,
      {
        method: 'DELETE',
        headers: {
          ...(token && {
            'Authorization': `Bearer ${token}`,
          }),
        },
      }
    );

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch {}
      throw new Error(errorData?.message || 'Error al cancelar reserva.');
    }

    return true;
  }
};