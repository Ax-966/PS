'use strict';

const UISeats = {

  /**
   * Construir la grilla HTML de butacas para un sector.
   * Idéntica al _buildSeatGrid original de ui.js, extraída acá para separar responsabilidades.
   *
   * @param {Object} event  - Evento con sectors ya cargados
   * @param {Object} sector - Sector activo con su array de seats
   * @returns {string} HTML de la grilla de butacas
   */
  buildGrid(event, sector) {
    if (!sector?.seats?.length) {
      return '<p style="text-align:center;color:var(--text-3);padding:40px;">Este sector no tiene butacas configuradas.</p>';
    }

    const rows        = Math.max(...sector.seats.map(s => s.row || 1));
    const cols        = Math.max(...sector.seats.map(s => s.col || 1));
    const selectedIds = new Set(UI.selectedSeats.map(s => s.seatId));

    let html = `<div class="seat-grid" style="grid-template-columns: repeat(${cols}, 34px)" role="list">`;

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const seat = sector.seats.find(s => s.row === r && s.col === c);

        if (!seat) {
          html += `<div class="seat placeholder" aria-hidden="true"></div>`;
          continue;
        }

        const isSelected = selectedIds.has(seat.id);
        const status     = (seat.status || '').toLowerCase();
        let cls          = 'seat';
        let disabled     = false;
        let ariaLabel    = `Fila ${r}, Butaca ${c}`;

        if (isSelected) {
          cls      += ' selected';
          ariaLabel += ' — en tu selección';
        } else if (status === SEAT.AVAILABLE) {
          cls      += ' available';
          ariaLabel += ' — disponible';
        } else if (status === SEAT.LOCKED) {
          cls      += ' locked';
          disabled  = true;
          ariaLabel += ' — reservado temporalmente';
        } else if (status === SEAT.SOLD) {
          cls      += ' sold';
          disabled  = true;
          ariaLabel += ' — vendido';
        }

        html += `
          <button
            class="${cls}"
            ${disabled ? 'disabled aria-disabled="true"' : ''}
            role="listitem"
            aria-label="${ariaLabel}"
            title="${ariaLabel}"
            onclick="${disabled ? '' : `UISeats.handleClick('${event.id}','${sector.id}','${seat.id}',${r},${c},${sector.price || 0})`}"
          ><span class="seat-label" aria-hidden="true">${c}</span></button>
        `;
      }
    }

    html += '</div>';
    return html;
  },

  /**
   * Manejar click en una butaca.
   *
   * Flujo normal:
   *   1. Si ya está seleccionada → desmarcar
   *   2. Llamar al backend POST /api/v1/reservations
   *   3. Guardar lockExpiry desde reservation.expiresAt (no calcular localmente)
   *   4. Actualizar panel → UITimer.start() se dispara automáticamente
   *
   * PUNTO DE EXTENSIÓN PARA 409 (Gabriela agrega esto en el catch):
   *   Detectar response.status === 409, mostrar toast de error,
   *   llamar UITimer.onConflict(seatId) y hacer refresh del mapa.
   *
   * @param {string|number} eventId
   * @param {string|number} sectorId
   * @param {string}        seatId   - Guid de la butaca
   * @param {number}        row
   * @param {number}        col
   * @param {number}        price
   */
  async handleClick(eventId, sectorId, seatId, row, col, price) {
    // Admin no puede reservar butacas
    if (Auth.isAdmin()) {
      UI.showToast('Los administradores no pueden reservar butacas.', 'info');
      return;
    }
    const username = Auth.currentUser?.username;
    if (!username) return;
   
    // Si ya está en el carrito → desmarcar
    const existingIdx = UI.selectedSeats.findIndex(s => s.seatId === seatId);
    if (existingIdx >= 0) {
      UI.selectedSeats.splice(existingIdx, 1);
      await this.refresh();
      UI._updateSelectionPanel();
      return;
    }

    // Verificar estado fresco del backend ANTES de reservar
    try {
      const freshSeat = await Events.getSeat(seatId);
      if (!freshSeat) {
        UI.showToast('Butaca no encontrada.', 'error');
        return;
      }
      if (freshSeat.status?.toLowerCase() !== SEAT.AVAILABLE) {
        UI.showToast('Esta butaca ya no está disponible.', 'error');
        await this.refresh();
        return;
      }
    } catch {
      UI.showToast('Error al verificar la butaca.', 'error');
      return;
    }
    try {
      // TODO: reemplazar 1 por Auth.currentUser.backendId cuando esté conectado con Identity
      const reservation = await Reservations.create(1, seatId);

      if (reservation) {
        const event  = await Events.getById(eventId);
        const sector = event?.sectors?.find(s => String(s.id) === String(sectorId));

        // lockExpiry desde expiresAt del backend — no calculado localmente
        // Esto garantiza que el timer del frontend coincide con el servidor
        const lockExpiry = reservation.expiresAt
          ? new Date(reservation.expiresAt).getTime()
          : Date.now() + LOCK_DURATION_MS; // fallback si el backend no manda expiresAt

        UI.selectedSeats.push({
          eventId,
          sectorId,
          seatId,
          seatLabel:  `Fila ${row} · Butaca ${col}`,
          sectorName: sector?.name || '',
          eventName:  event?.name  || '',
          price,
          lockExpiry, // ← viene del backend
        });

        UI.showToast(`✅ Butaca seleccionada: Fila ${row}, Butaca ${col}`, 'success');
      }

    } catch (err) {
      // ── PUNTO DE EXTENSIÓN PARA 409 (Gabriela agrega esto) ──────────
      // Verificar si el error es un 409 Conflict del backend:
      //
      // if (err.status === 409) {
      //   UI.showToast('Este asiento fue tomado por otro usuario. Elegí otro.', 'error');
      //   UITimer.onConflict(seatId);
      //   await this.refresh();
      //   return;
      // }
      //
      // ─────────────────────────────────────────────────────────────────
      console.error('[UISeats] Error al reservar:', err);
      UI.showToast('Error al reservar la butaca.', 'error');
    }

    await this.refresh();
    UI._updateSelectionPanel();
  },

  /**
   * Refrescar solo el mapa de butacas sin recargar toda la vista.
   * Se llama después de cada click, cuando expira el timer,
   * y cuando Gabriela detecte un 409.
   */
  async refresh() {
    if (UI.currentView !== 'event-detail' || !UI.currentEventId) return;

    try {
      const event    = await Events.getById(UI.currentEventId);
      const sectors  = await Events.getSectorsByEvent(UI.currentEventId);
      const seatsAll = await Events.getSeatsByEvent(UI.currentEventId);

      if (!event || !sectors.length) return;

      // Reconstruir sectors con sus seats agrupados
      event.sectors = sectors.map(s => ({
        ...s,
        seats: seatsAll
          .filter(seat => String(seat.sectorId) === String(s.id))
          .map((seat, index) => ({
            ...seat,
            status: seat.status?.toLowerCase(),
            row:    Math.floor(index / 10) + 1,
            col:    (index % 10) + 1,
          })),
      }));

      const sector = event.sectors.find(s => Number(s.id) === Number(UI.currentSectorId));
      if (!sector) return;

      // Actualizar solo la grilla, sin recargar toda la vista
      const mapEl = document.getElementById('seat-map');
      if (mapEl) mapEl.innerHTML = this.buildGrid(event, sector);

      // Actualizar contador de disponibles
      const infoEl = document.getElementById('sector-info');
      if (infoEl) {
        const avail = sector.seats?.filter(s => s.status === SEAT.AVAILABLE).length || 0;
        infoEl.innerHTML = `Sector: <strong>${UI._escapeHtml(sector.name)}</strong> &middot; ${avail} de ${sector.seats.length} disponibles`;
      }
    } catch (err) {
      console.error('[UISeats] Error al refrescar el mapa:', err);
    }
  },
};