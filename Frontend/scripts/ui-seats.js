'use strict';

const UISeats = {

  buildGrid(event, sector) {

    if (!sector?.seats?.length) {
      return `
        <p style="text-align:center;color:var(--text-3);padding:40px;">
          Este sector no tiene butacas configuradas.
        </p>
      `;
    }

    // ─────────────────────────────────────────────
    // Filas reales desde backend (A,B,C...)
    // ─────────────────────────────────────────────
    const uniqueRows = [
      ...new Set(
        sector.seats.map(s => s.row)
      )
    ];

    // ─────────────────────────────────────────────
    // Cantidad REAL de columnas
    // ─────────────────────────────────────────────
    const cols = Math.max(
      ...sector.seats.map(s => Number(s.col) || 1)
    );

    const selectedIds = new Set(
      UI.selectedSeats.map(s => s.seatId)
    );

    let html = `<div class="seat-grid" role="list">`;

    // ─────────────────────────────────────────────
    // Render real por fila y columna
    // ─────────────────────────────────────────────
   for (let rowIndex = 0; rowIndex < uniqueRows.length; rowIndex++) {
        const rowId = uniqueRows[rowIndex];

        html += `<div class="seat-row">`;
        html += `<div class="seat-row-label">${String.fromCharCode(64 + rowId)}</div>`;

        for (let c = 1; c <= cols; c++) {

        const seat = sector.seats.find(
          s =>
            String(s.row) === String(rowId) &&
            Number(s.col) === Number(c)
        );

        // Espacio vacío
        if (!seat) {
          html += `
            <div 
              class="seat placeholder"
              aria-hidden="true"
            ></div>
          `;
          continue;
        }

        const isSelected = selectedIds.has(seat.id);

        const status = String(
          seat.status || ''
        ).toLowerCase();

        let cls = 'seat';
        let disabled = false;

        const seatNumber = (rowIndex * cols) + c;
        let ariaLabel = `Fila ${rowId}, Butaca ${seatNumber}`;

        if (isSelected) {

          cls += ' selected';
          ariaLabel += ' — en tu selección';

        } else if (status === SEAT.AVAILABLE) {

          cls += ' available';
          ariaLabel += ' — disponible';

        } else if (status === SEAT.LOCKED) {

          cls += ' locked';
          disabled = true;
          ariaLabel += ' — reservado temporalmente';

        } else if (status === SEAT.SOLD) {

          cls += ' sold';
          disabled = true;
          ariaLabel += ' — vendido';
        }

        html += `
          <button
            class="${cls}"

            ${disabled
              ? 'disabled aria-disabled="true"'
              : ''
            }

            role="listitem"

            aria-label="${ariaLabel}"
            title="${ariaLabel}"

            onclick="${
              disabled
                ? ''
                : `
                  UISeats.handleClick(
                    '${event.id}',
                    '${sector.id}',
                    '${seat.id}',
                    '${rowId}',
                    ${c},
                    ${sector.price || 0}
                  )
                `
            }"
          >
            <span class="seat-label" aria-hidden="true">
  ${seatNumber}
</span>
          </button>
        `;
     }
      html += `</div>`;  // cierra seat-row
    }
     
    html += '</div>'; // cierra seat-grid
    return html;
  },

  async handleClick(
    eventId,
    sectorId,
    seatId,
    row,
    col,
    price
  ) {

    if (Auth.isAdmin()) {
      UI.showToast(
        'Los administradores no pueden reservar butacas.',
        'info'
      );
      return;
    }

    const username = Auth.isClient();

    if (!username) return;

    const existingIdx = UI.selectedSeats.findIndex(
      s => s.seatId === seatId
    );

    // Deseleccionar localmente
   // Deseleccionar
if (existingIdx >= 0) {

  try {

    const seat =
      UI.selectedSeats[existingIdx];

    const userId =
      Number(Auth.getUserId());

    await Reservations.delete(
      seat.reservationId,
      userId
    );

    UI.selectedSeats.splice(
      existingIdx,
      1
    );

    await this.refresh();

    UI._updateSelectionPanel();

    UI.showToast(
      'Butaca liberada.',
      'info'
    );

  } catch (err) {

    console.error(
      '[UISeats] Error al liberar:',
      err
    );

    UI.showToast(
      'Error al liberar butaca.',
      'error'
    );
  }

  return;
}

    // Estado fresco del backend
    try {

      const freshSeat = await Events.getSeat(seatId);

      if (!freshSeat) {

        UI.showToast(
          'Butaca no encontrada.',
          'error'
        );

        return;
      }

      if (
        String(freshSeat.status || '')
          .toLowerCase() !== 'available'
      ) {

        UI.showToast(
          'Esta butaca ya no está disponible.',
          'error'
        );

        await this.refresh();

        return;
      }

    } catch {

      UI.showToast(
        'Error al verificar la butaca.',
        'error'
      );

      return;
    }

    try {

      const userId = Number(Auth.getUserId());
      const reservation = await Reservations.create(userId, seatId);

      if (reservation) {

        const event = await Events.getById(eventId);

        const sector = event?.sectors?.find(
          s => String(s.id) === String(sectorId)
        );

        UI.selectedSeats.push({

          reservationId: reservation.id,
          eventId,
          sectorId,
          seatId,

          seatLabel:
            `Fila ${row} · Butaca ${col}`,

          sectorName:
            sector?.name || '',

          eventName:
            event?.name || '',

          price,
            
          lockExpiry: reservation.expiresAt   
          ? new Date(reservation.expiresAt).getTime()
          : Date.now() + LOCK_DURATION_MS,
        });

        UI.showToast(
          `✅ Butaca seleccionada: Fila ${row}, Butaca ${col}`,
          'success'
        );
      }

    } catch (err) {

      console.error(
        '[UISeats] Error al reservar:',
        err
      );

      if (err.status === 409) {

        UI.showToast(
          'Este asiento fue tomado por otro usuario.',
          'error'
        );

        await this.refresh();

        return;
      }

      UI.showToast(
        'Error al reservar la butaca.',
        'error'
      );
    }

    await this.refresh();

    UI._updateSelectionPanel();
  },

  async refresh() {

    if (
      UI.currentView !== 'event-detail' ||
      !UI.currentEventId
    ) return;

    try {

      const event =
        await Events.getById(UI.currentEventId);

      const sectors =
        await Events.getSectorsByEvent(
          UI.currentEventId
        );

      const seatsAll =
        await Events.getSeatsByEvent(
          UI.currentEventId
        );

      if (!event || !sectors.length) return;

      event.sectors = sectors.map(s => ({

        ...s,

        seats: seatsAll

          .filter(
            seat =>
              String(seat.sectorId) ===
              String(s.id)
          )

          .map((seat, index) => ({
          ...seat,
          row: Math.floor(index / (s.cols || 10)) + 1,
          col: (index % (s.cols || 10)) + 1,
          status: String(seat.status || '').toLowerCase(),
        })),
      }));

      const sector = event.sectors.find(
        s =>
          Number(s.id) ===
          Number(UI.currentSectorId)
      );

      if (!sector) return;

      const mapEl =
        document.getElementById('seat-map');

      if (mapEl) {
        mapEl.innerHTML =
          this.buildGrid(event, sector);
      }

      const infoEl =
        document.getElementById('sector-info');

      if (infoEl) {

        const avail =
          sector.seats?.filter(
            s => s.status === SEAT.AVAILABLE
          ).length || 0;

        infoEl.innerHTML = `
          Sector:
          <strong>
            ${UI._escapeHtml(sector.name)}
          </strong>
          &middot;
          ${avail}
          de
          ${sector.seats.length}
          disponibles
        `;
      }

    } catch (err) {

      console.error(
        '[UISeats] Error al refrescar el mapa:',
        err
      );
    }
  },
};