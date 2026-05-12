/**
 * ORDEN DE CARGA:
 *   constants.js → store.js → audit.js → auth.js → events.js → ui-timer.js → ui-seats.js → ui.js
 */

'use strict';

const UITimer = {

  /** @type {number|null} ID del setInterval activo */
  _intervalId: null,


  start() {
    this.stop(); // limpiar interval anterior antes de crear uno nuevo

    this._intervalId = setInterval(() => {
      if (!UI.selectedSeats.length) {
        this.stop();
        return;
      }

      // Mostrar el tiempo de la butaca que expira PRIMERO
      const minExpiry = Math.min(...UI.selectedSeats.map(s => s.lockExpiry));
      const remaining = Math.max(0, minExpiry - Date.now());

      this._render(remaining);

      if (remaining === 0) {
        this._handleExpired();
      }
    }, 1000);
  },

  /**
   * Detener el countdown y limpiar el DOM.
   */
  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._clearDOM();
  },


 
  onConflict(seatId) {
    UI.selectedSeats = UI.selectedSeats.filter(s => s.seatId !== seatId);

    if (UI.selectedSeats.length) {
      this.start(); 
    } else {
      this.stop();
    }
  },

  _render(remainingMs) {
    const el = document.getElementById('countdown-timer');
    if (!el) return;

    const min = Math.floor(remainingMs / 60000);
    const sec = Math.floor((remainingMs % 60000) / 1000);

    el.textContent = `⏱ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    el.className   = `countdown${remainingMs < 60_000 ? ' urgent' : ''}`;
    el.setAttribute('aria-label', `Tiempo restante: ${min} minutos ${sec} segundos`);
  },


  _clearDOM() {
    const el = document.getElementById('countdown-timer');
    if (el) {
      el.textContent = '';
      el.className   = 'countdown';
      el.removeAttribute('aria-label');
    }
  },


  _handleExpired() {
    const now     = Date.now();
    const expired = UI.selectedSeats.filter(s => s.lockExpiry <= now);
    if (!expired.length) return;

    UI.selectedSeats = UI.selectedSeats.filter(s => s.lockExpiry > now);
    UI._updateSelectionPanel();
    UISeats.refresh();

    UI.showToast(
      `⏰ ${expired.length} butaca${expired.length > 1 ? 's' : ''} liberada${expired.length > 1 ? 's' : ''} por tiempo de espera.`,
      'warning',
    );
  },
};