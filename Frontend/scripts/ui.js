/**
 * TicketVivo — ui.js
 * FIXES:
 *  - renderView() es ahora async
 *  - Todos los builders que llaman al backend usan await
 *  - handleSeatClick() es async
 *  - Se eliminó la declaración duplicada de const UI
 *  - demoConcurrencia y _confirmResetSeats adaptados (sin updateSeat real)
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js → events.js → ui.js → main.js
 */

'use strict';

const UI = {
  currentView:     null,
  currentEventId:  null,
  currentSectorId: null,
  selectedSeats:   [],
  countdownInterval: null,

  /* ----------------------------------------------------------
     INICIALIZACIÓN
     ---------------------------------------------------------- */
  init() {
    this._setupNav();
    this._setupTheme();
    this.renderView('home');
    this._updateSelectionPanel();
  },

  _setupNav() {
    const user = Auth.currentUser;

    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;
        this.renderView(view);
      });
    });

    if (Auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    const usernameEl = document.getElementById('nav-username');
    const avatarEl   = document.getElementById('user-avatar-char');
    const ddUsername = document.getElementById('dd-username');
    const ddEmail    = document.getElementById('dd-email');
    const ddRole     = document.getElementById('dd-role');

    if (usernameEl) usernameEl.textContent = user?.username || '';
    if (avatarEl)   avatarEl.textContent   = (user?.username || 'U').charAt(0).toUpperCase();
    if (ddUsername) ddUsername.textContent = user?.username || '';
    if (ddEmail)    ddEmail.textContent    = user?.email || '';
    if (ddRole)     ddRole.textContent     = user?.role === 'admin' ? 'Administrador' : 'Cliente';

    const userBtn      = document.getElementById('btn-user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !userDropdown.classList.contains('hidden');
        userDropdown.classList.toggle('hidden', open);
        userBtn.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', () => {
        userDropdown.classList.add('hidden');
        userBtn?.setAttribute('aria-expanded', 'false');
      });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
        location.reload();
      });
    }

    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = mobileNav.classList.contains('hidden');
        mobileNav.classList.toggle('hidden', !open);
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', () => {
        mobileNav.classList.add('hidden');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    }

    const themeMobileBtn = document.getElementById('btn-theme-mobile');
    if (themeMobileBtn) {
      themeMobileBtn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const next    = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        Store.set('theme', next);
        const icon = document.querySelector('.theme-icon');
        if (icon) icon.textContent = next === 'dark' ? '☀' : '🌙';
        this.closeMobileNav();
      });
    }

    const purchaseBtn = document.getElementById('btn-purchase');
    if (purchaseBtn) purchaseBtn.addEventListener('click', () => this._handlePurchase());

    const clearBtn = document.getElementById('btn-clear-selection');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

    this._initScrollTop();
  },

  closeMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    const hamburger = document.getElementById('hamburger-btn');
    mobileNav?.classList.add('hidden');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
  },

  closeUserMenu() {
    document.getElementById('user-dropdown')?.classList.add('hidden');
    document.getElementById('btn-user-menu')?.setAttribute('aria-expanded', 'false');
  },

  _initScrollTop() {
    const btn = document.createElement('button');
    btn.className = 'scroll-top-btn no-print';
    btn.innerHTML = '↑';
    btn.title     = 'Volver arriba';
    btn.setAttribute('aria-label', 'Volver al inicio de la página');
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  _setupTheme() {
    const saved = Store.get('theme', 'dark');
    document.documentElement.dataset.theme = saved;
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = saved === 'dark' ? '☀' : '🌙';

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const next    = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        Store.set('theme', next);
        if (icon) icon.textContent = next === 'dark' ? '☀' : '🌙';
      });
    }
  },

  /* ----------------------------------------------------------
     ROUTER DE VISTAS — async para soportar builders con await
     ---------------------------------------------------------- */
  async renderView(view, params = {}) {
    this.currentView = view;
    const main = document.getElementById('main-content');
    if (!main) return;

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Mostrar spinner mientras carga
    main.innerHTML = '<div class="loading-spinner" aria-live="polite">Cargando...</div>';

    let html = '';
    try {
      switch (view) {
        case 'home':
          html = await this._buildHome();
          break;
        case 'event-detail':
          this.currentEventId = params.eventId;
          html = await this._buildEventDetail(params.eventId);
          break;
        case 'my-tickets':
          html = await this._buildMyTickets();
          break;
        case 'admin':
          if (!Auth.isAdmin()) { html = '<div class="error-state">Acceso denegado.</div>'; break; }
          html = await this._buildAdmin();
          break;
        case 'admin-form':
          if (!Auth.isAdmin()) { html = '<div class="error-state">Acceso denegado.</div>'; break; }
          html = await this._buildEventForm(params.eventId || null);
          break;
        case 'admin-audit':
          if (!Auth.isAdmin()) { html = '<div class="error-state">Acceso denegado.</div>'; break; }
          html = this._buildAuditLogs();
          break;
        default:
          html = '<div class="error-state">Vista no encontrada.</div>';
      }
    } catch (err) {
      console.error('[UI] Error renderizando vista:', err);
      html = '<div class="error-state">Error al cargar la vista. Revisá la consola.</div>';
    }

    main.innerHTML = `<div class="page-enter">${html}</div>`;

    if (view === 'admin-form') this._attachFormListeners(params.eventId || null);
  },

  /* ----------------------------------------------------------
     VISTA: HOME
     ---------------------------------------------------------- */
  async _buildHome() {
    const events = await Events.getAll();
    const list   = Array.isArray(events) ? events : [];

    if (list.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🎸</div>
          <p>No hay eventos disponibles aún.</p>
          ${Auth.isAdmin() ? '<button class="btn-primary" onclick="UI.renderView(\'admin-form\', {})">Crear primer evento</button>' : ''}
        </div>
      `;
    }

    const genres = [...new Set(list.map(e => e.genre).filter(Boolean))].sort();

    return `
      <div class="page-header">
        <h1 class="page-title">Próximos <span class="accent">Eventos</span></h1>
        <p class="page-subtitle">Conseguí tus entradas antes de que se agoten</p>
      </div>

      <div class="search-filter-bar" id="search-bar">
        <div class="search-wrap">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            id="search-input"
            placeholder="Buscar evento o lugar..."
            autocomplete="off"
            aria-label="Buscar eventos"
            oninput="UI.filterEvents()"
          />
          <button class="search-clear hidden" id="search-clear" onclick="UI.clearSearch()" aria-label="Limpiar búsqueda">✕</button>
        </div>
        <div class="filter-selects">
          <select id="filter-genre" aria-label="Filtrar por género" onchange="UI.filterEvents()">
            <option value="">Todos los géneros</option>
            ${genres.map(g => `<option value="${this._escapeHtml(g)}">${this._escapeHtml(g)}</option>`).join('')}
          </select>
          <select id="filter-avail" aria-label="Filtrar por disponibilidad" onchange="UI.filterEvents()">
            <option value="">Toda disponibilidad</option>
            <option value="available">Con entradas</option>
            <option value="sold">Agotados</option>
          </select>
        </div>
        <span class="results-count" id="results-count"></span>
      </div>

      <div class="events-grid" id="events-grid">
        ${list.map(e => this._buildEventCard(e)).join('')}
      </div>
    `;
  },

  // Nota: filterEvents necesita volver a buscar los eventos del backend
  async filterEvents() {
    const query  = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const genre  = document.getElementById('filter-genre')?.value  || '';
    const avail  = document.getElementById('filter-avail')?.value  || '';
    const grid   = document.getElementById('events-grid');
    const count  = document.getElementById('results-count');
    const clearX = document.getElementById('search-clear');

    if (!grid) return;
    if (clearX) clearX.classList.toggle('hidden', !query);

    const events = await Events.getAll();
    const list   = Array.isArray(events) ? events : [];

    let matched = list.filter(e => {
      if (query && !e.name?.toLowerCase().includes(query) && !e.venue?.toLowerCase().includes(query)) return false;
      if (genre && e.genre !== genre) return false;
      // Nota: disponibilidad por sector requiere datos de seats del backend
      return true;
    });

    if (!matched.length) {
      grid.innerHTML = `
        <div class="no-results">
          <span class="nr-icon">🔍</span>
          <p>No encontramos eventos con esos filtros.</p>
          <button class="btn-ghost" onclick="UI.resetFilters()">Limpiar filtros</button>
        </div>
      `;
    } else {
      grid.innerHTML = matched.map(e => this._buildEventCard(e)).join('');
    }

    if (count) {
      count.innerHTML = matched.length < list.length
        ? `Mostrando <strong>${matched.length}</strong> de <strong>${list.length}</strong> eventos`
        : '';
    }
  },

  clearSearch() {
    const input = document.getElementById('search-input');
    if (input) { input.value = ''; input.focus(); }
    this.filterEvents();
  },

  resetFilters() {
    const si = document.getElementById('search-input');
    const fg = document.getElementById('filter-genre');
    const fa = document.getElementById('filter-avail');
    if (si) si.value = '';
    if (fg) fg.value = '';
    if (fa) fa.value = '';
    this.filterEvents();
  },

  // Las cards del backend no tienen sectors/seats embebidos aún
  // Adaptamos para que funcione con o sin esos datos
  _buildEventCard(event) {
    const date      = new Date(event.eventDate || event.date);
    const available = event.availableSeats ?? '—';
    const minPrice  = event.minPrice ?? event.price ?? 0;

    return `
      <article
        class="event-card"
        role="button"
        tabindex="0"
        aria-label="Ver butacas para ${this._escapeHtml(event.name)}"
        onclick="UI.renderView('event-detail', { eventId: '${event.id}' })"
        onkeydown="if(event.key==='Enter')UI.renderView('event-detail',{eventId:'${event.id}'})"
      >
        <div class="card-badge">${this._escapeHtml(event.genre || 'En vivo')}</div>
        <div class="card-body">
          <div class="card-date" aria-label="${date.toLocaleDateString('es-AR')}">
            <span class="date-day">${date.getDate()}</span>
            <span class="date-month">${date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</span>
          </div>
          <div class="card-info">
            <h2 class="card-title">${this._escapeHtml(event.name)}</h2>
            <p class="card-venue">📍 ${this._escapeHtml(event.venue)}</p>
            <p class="card-time">🕐 ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</p>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-availability">
            <span class="avail-text">${typeof available === 'number' ? `${available} butacas disponibles` : 'Ver disponibilidad'}</span>
          </div>
          ${minPrice > 0 ? `<div class="card-price">Desde <strong>$${minPrice.toLocaleString('es-AR')}</strong></div>` : ''}
          <button class="btn-card" tabindex="-1">Ver butacas →</button>
        </div>
      </article>
    `;
  },

  /* ----------------------------------------------------------
     VISTA: DETALLE DE EVENTO
     ---------------------------------------------------------- */
  async _buildEventDetail(eventId) {
    const event = await Events.getById(eventId);
    if (!event) return '<div class="error-state">Evento no encontrado.</div>';

    // Obtener sectores y seats desde el backend
    const sectors = await Events.getSectors(eventId);
    const seats   = await Events.getSeats(eventId);

    // Adjuntar seats a cada sector (agrupar por sectorId)
    const enrichedSectors = sectors.map(sector => ({
      ...sector,
      seats: seats.filter(s => s.sectorId === sector.id),
    }));

    // Guardar en el evento para uso interno de la vista
    event.sectors = enrichedSectors;

    // Sector activo
    if (!this.currentSectorId || !enrichedSectors.find(s => s.id === this.currentSectorId)) {
      this.currentSectorId = enrichedSectors[0]?.id || null;
    }

    const sector = enrichedSectors.find(s => s.id === this.currentSectorId);
    const date   = new Date(event.eventDate || event.date);

    return `
      <div class="event-detail">
        <button class="btn-back" onclick="UI.renderView('home')">← Volver a eventos</button>

        <div class="event-hero">
          <span class="hero-genre">${this._escapeHtml(event.genre || 'Música en vivo')}</span>
          <h1 class="hero-title">${this._escapeHtml(event.name)}</h1>
          <div class="hero-meta">
            <span>📅 ${date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>🕐 ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
            <span>📍 ${this._escapeHtml(event.venue)}</span>
          </div>
          ${event.description ? `<p class="hero-desc">${this._escapeHtml(event.description)}</p>` : ''}
        </div>

        <div class="seat-section">
          <div class="sector-tabs" role="tablist">
            ${enrichedSectors.map(s => `
              <button
                class="sector-tab ${s.id === this.currentSectorId ? 'active' : ''}"
                role="tab"
                aria-selected="${s.id === this.currentSectorId}"
                onclick="UI.switchSector('${eventId}', '${s.id}')"
              >
                ${this._escapeHtml(s.name)} ${s.price ? `— $${s.price.toLocaleString('es-AR')}` : ''}
              </button>
            `).join('')}
          </div>

          <div class="seat-map-container" role="tabpanel">
            <div class="stage-label" aria-hidden="true">▲ ESCENARIO ▲</div>
            <div class="seat-legend" role="list">
              <span class="legend-item" role="listitem"><span class="dot available" aria-hidden="true"></span> Disponible</span>
              <span class="legend-item" role="listitem"><span class="dot locked" aria-hidden="true"></span> Reservado</span>
              <span class="legend-item" role="listitem"><span class="dot sold" aria-hidden="true"></span> Vendido</span>
              <span class="legend-item" role="listitem"><span class="dot selected" aria-hidden="true"></span> Tu selección</span>
            </div>
            <div class="seat-map" id="seat-map" aria-label="Mapa de butacas">
              ${this._buildSeatGrid(event, sector)}
            </div>
            <p class="sector-info" id="sector-info">
              Sector: <strong>${this._escapeHtml(sector?.name || '')}</strong> &middot;
              ${sector?.seats?.filter(s => s.status?.toLowerCase() === SEAT.AVAILABLE).length || 0} de ${sector?.seats?.length || 0} disponibles
            </p>
          </div>
        </div>
      </div>
    `;
  },

  _buildSeatGrid(event, sector) {
    if (!sector || !sector.seats || !sector.seats.length) {
      return '<p style="text-align:center;color:var(--text-3);padding:40px;">Este sector no tiene butacas configuradas.</p>';
    }

    // El backend devuelve rowIdentifier y seatNumber
    // Convertimos a row/col numéricos para el grid
    const selectedIds = new Set(this.selectedSeats.map(s => s.seatId));

    // Agrupar por fila
    const rowMap = {};
    sector.seats.forEach(seat => {
      const row = seat.rowIdentifier || seat.row || 'A';
      if (!rowMap[row]) rowMap[row] = [];
      rowMap[row].push(seat);
    });

    const rowKeys = Object.keys(rowMap).sort();
    let html = '';

    rowKeys.forEach(rowKey => {
      const rowSeats = rowMap[rowKey].sort((a, b) => (a.seatNumber || a.col || 0) - (b.seatNumber || b.col || 0));
      const cols     = rowSeats.length;

      html += `<div class="seat-grid" style="grid-template-columns: auto repeat(${cols}, 34px)" role="list">`;
      html += `<div class="seat row-label">${rowKey}</div>`;

      rowSeats.forEach(seat => {
        const isSelected = selectedIds.has(seat.id);
        const status     = (seat.status || '').toLowerCase();
        let cls          = 'seat';
        let disabled     = false;
        const col        = seat.seatNumber || seat.col || '?';
        let ariaLabel    = `Fila ${rowKey}, Butaca ${col}`;

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
            onclick="${disabled ? '' : `UI.handleSeatClick('${event.id}','${sector.id}','${seat.id}','${rowKey}',${col},${sector.price || 0})`}"
          ><span class="seat-label" aria-hidden="true">${col}</span></button>
        `;
      });

      html += '</div>';
    });

    return html;
  },

  switchSector(eventId, sectorId) {
    this.currentSectorId = sectorId;
    this.renderView('event-detail', { eventId });
  },

  /* ----------------------------------------------------------
     CLICK EN BUTACA — async porque Seats.lock es async
     ---------------------------------------------------------- */
  async handleSeatClick(eventId, sectorId, seatId, row, col, price) {
    const username = Auth.currentUser?.username;
    if (!username) return;

    // ¿Ya está en el carrito? → deseleccionar
    const existingIdx = this.selectedSeats.findIndex(s => s.seatId === seatId);
    if (existingIdx >= 0) {
      const sel = this.selectedSeats[existingIdx];
      Seats.unlock(sel.eventId, sel.sectorId, seatId, username);
      this.selectedSeats.splice(existingIdx, 1);
      await this._refreshSeatMap();
      this._updateSelectionPanel();
      return;
    }

    // Intentar bloquear en el backend
    const result = await Seats.lock(eventId, seatId, username);

    if (result.success) {
      const event  = await Events.getById(eventId);
      const sectors = await Events.getSectors(eventId);
      const sector  = sectors.find(s => s.id === sectorId);
      this.selectedSeats.push({
        eventId,
        sectorId,
        seatId,
        seatLabel:  `Fila ${row} · Butaca ${col}`,
        sectorName: sector?.name  || '',
        eventName:  event?.name   || '',
        price:      price,
        lockExpiry: new Date(result.lockExpiry).getTime(),
      });
      this.showToast(`Butaca seleccionada: Fila ${row}, Butaca ${col}`, 'success');
    } else {
      this.showToast(result.error, 'error');
    }

    await this._refreshSeatMap();
    this._updateSelectionPanel();
  },

  async _refreshSeatMap() {
    if (this.currentView !== 'event-detail' || !this.currentEventId) return;

    const event   = await Events.getById(this.currentEventId);
    const sectors = await Events.getSectors(this.currentEventId);
    const seats   = await Events.getSeats(this.currentEventId);

    if (!event || !sectors.length) return;

    const sector = sectors.find(s => s.id === this.currentSectorId);
    if (!sector) return;

    sector.seats = seats.filter(s => s.sectorId === sector.id);
    event.sectors = sectors.map(s => ({ ...s, seats: seats.filter(se => se.sectorId === s.id) }));

    const mapEl = document.getElementById('seat-map');
    if (mapEl) mapEl.innerHTML = this._buildSeatGrid(event, sector);

    const infoEl = document.getElementById('sector-info');
    if (infoEl) {
      const avail = sector.seats?.filter(s => s.status?.toLowerCase() === SEAT.AVAILABLE).length || 0;
      infoEl.innerHTML = `Sector: <strong>${this._escapeHtml(sector.name)}</strong> &middot; ${avail} de ${sector.seats.length} disponibles`;
    }
  },

  /* ----------------------------------------------------------
     PANEL DE SELECCIÓN
     ---------------------------------------------------------- */
  _updateSelectionPanel() {
    const panel   = document.getElementById('selection-panel');
    const listEl  = document.getElementById('selection-list');
    const totalEl = document.getElementById('selection-total-amount');
    const countEl = document.getElementById('selection-count');
    if (!panel) return;

    if (this.selectedSeats.length === 0) {
      panel.classList.add('hidden');
      this._stopCountdown();
      return;
    }

    panel.classList.remove('hidden');

    if (listEl) {
      listEl.innerHTML = this.selectedSeats.map(s => `
        <div class="selection-item" role="listitem">
          <div class="sel-info">
            <strong>${this._escapeHtml(s.seatLabel)}</strong>
            <span>${this._escapeHtml(s.sectorName)} · ${this._escapeHtml(s.eventName)}</span>
          </div>
          <span class="sel-price">$${s.price.toLocaleString('es-AR')}</span>
          <button
            class="sel-remove"
            aria-label="Quitar ${s.seatLabel}"
            onclick="UI.removeSeat('${s.seatId}')"
          >✕</button>
        </div>
      `).join('');
    }

    const total = this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-AR')}`;
    if (countEl) countEl.textContent = `${this.selectedSeats.length} butaca${this.selectedSeats.length !== 1 ? 's' : ''}`;

    this._startCountdown();
  },

  async removeSeat(seatId) {
    const idx = this.selectedSeats.findIndex(s => s.seatId === seatId);
    if (idx < 0) return;
    const sel = this.selectedSeats[idx];
    Seats.unlock(sel.eventId, sel.sectorId, seatId, Auth.currentUser?.username || '');
    this.selectedSeats.splice(idx, 1);
    await this._refreshSeatMap();
    this._updateSelectionPanel();
  },

  async clearSelection() {
    this.selectedSeats.forEach(sel => {
      Seats.unlock(sel.eventId, sel.sectorId, sel.seatId, Auth.currentUser?.username || '');
    });
    this.selectedSeats = [];
    await this._refreshSeatMap();
    this._updateSelectionPanel();
    this.showToast('Selección cancelada.', 'info');
  },

  _startCountdown() {
    this._stopCountdown();
    this.countdownInterval = setInterval(() => {
      if (!this.selectedSeats.length) { this._stopCountdown(); return; }

      const minExpiry = Math.min(...this.selectedSeats.map(s => s.lockExpiry));
      const remaining = Math.max(0, minExpiry - Date.now());
      const el        = document.getElementById('countdown-timer');

      if (el) {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        el.textContent = `⏱ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        el.className   = `countdown${remaining < 60000 ? ' urgent' : ''}`;
        el.setAttribute('aria-label', `Tiempo restante: ${min} minutos ${sec} segundos`);
      }

      if (remaining === 0) {
        const now     = Date.now();
        const expired = this.selectedSeats.filter(s => s.lockExpiry <= now);
        if (expired.length) {
          this.selectedSeats = this.selectedSeats.filter(s => s.lockExpiry > now);
          this._updateSelectionPanel();
          this._refreshSeatMap();
          this.showToast(
            `⏰ ${expired.length} butaca${expired.length > 1 ? 's' : ''} fue${expired.length > 1 ? 'ron' : ''} liberada${expired.length > 1 ? 's' : ''} por tiempo de espera.`,
            'warning'
          );
        }
      }
    }, 1000);
  },

  _stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    const el = document.getElementById('countdown-timer');
    if (el) { el.textContent = ''; el.className = 'countdown'; }
  },

  async _handlePurchase() {
    if (!this.selectedSeats.length) return;

    const result = Seats.purchase(this.selectedSeats, Auth.currentUser?.username || '');

    if (result.success) {
      const count        = this.selectedSeats.length;
      this.selectedSeats = [];
      this._stopCountdown();
      this._updateSelectionPanel();
      await this._refreshSeatMap();
      this._showPurchaseModal(count);
    } else {
      this.showToast(result.error, 'error');
      const now = Date.now();
      this.selectedSeats = this.selectedSeats.filter(s => s.lockExpiry > now);
      this._updateSelectionPanel();
      await this._refreshSeatMap();
    }
  },

  _showPurchaseModal(count) {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal">
          <div class="modal-icon" aria-hidden="true">🎟️</div>
          <h2 id="modal-title">¡Compra exitosa!</h2>
          <p>Adquiriste <strong>${count} entrada${count !== 1 ? 's' : ''}</strong> correctamente.</p>
          <p class="modal-sub">Podés verlas en la sección "Mis entradas".</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn-primary" onclick="document.getElementById('modal-root').innerHTML=''">¡Genial!</button>
            <button class="btn-secondary" onclick="document.getElementById('modal-root').innerHTML='';UI.renderView('my-tickets')">Ver mis entradas</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => { if (root) root.innerHTML = ''; }, 10000);
  },

  /* ----------------------------------------------------------
     VISTA: MIS ENTRADAS
     ---------------------------------------------------------- */
  async _buildMyTickets() {
    const userId = Auth.currentUser?.id;
    if (!userId) return '<div class="error-state">Sesión inválida.</div>';

    const reservations = await Api.getReservationsByUser(userId);

    if (!reservations.length) {
      return `
        <div class="page-header">
          <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
        </div>
        <div class="empty-state">
          <div class="empty-icon">🎟️</div>
          <p>Todavía no compraste entradas.</p>
          <button class="btn-primary" onclick="UI.renderView('home')">Ver eventos disponibles</button>
        </div>
      `;
    }

    const total = reservations.length;

    return `
      <div class="page-header">
        <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
        <p class="page-subtitle">${total} reserva${total !== 1 ? 's' : ''}</p>
      </div>
      <div class="tickets-list">
        ${reservations.map(r => this._buildReservationCard(r)).join('')}
      </div>
    `;
  },

  _buildReservationCard(reservation) {
    const expiry = reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleString('es-AR') : '—';
    return `
      <div class="ticket-card" role="article">
        <div class="ticket-main">
          <div class="ticket-title">Reserva #${reservation.id?.slice(-8) || '?'}</div>
          <div class="ticket-detail">
            <span>Butaca ID: <strong>${reservation.seatId || '—'}</strong></span>
            <span>Estado: <strong>${reservation.status || '—'}</strong></span>
          </div>
          <div class="ticket-venue">Expira: ${expiry}</div>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     VISTA: ADMIN
     ---------------------------------------------------------- */
  async _buildAdmin() {
    const events = await Events.getAll();
    const logs   = Audit.getLogs();
    const list   = Array.isArray(events) ? events : [];

    return `
      <div class="page-header">
        <h1 class="page-title">Panel de <span class="accent">Administración</span></h1>
        <div class="header-actions">
          <button class="btn-primary" onclick="UI.renderView('admin-form', {})">+ Nuevo evento</button>
          <button class="btn-secondary" onclick="UI.renderView('admin-audit')">📋 Ver auditoría</button>
        </div>
      </div>

      <div class="admin-stats-bar">
        <div class="stat-card"><span class="sc-num">${list.length}</span><span class="sc-label">Eventos</span></div>
        <div class="stat-card"><span class="sc-num">${logs.length}</span><span class="sc-label">Acciones auditadas</span></div>
      </div>

      <div class="admin-events-list">
        ${list.length === 0
          ? '<div class="empty-state"><p>No hay eventos creados aún.</p></div>'
          : list.map(event => this._buildAdminEventRow(event)).join('')
        }
      </div>
    `;
  },

  _buildAdminEventRow(event) {
    const date = new Date(event.eventDate || event.date);
    return `
      <div class="admin-event-row">
        <div class="admin-event-info">
          <h3>${this._escapeHtml(event.name)}</h3>
          <p>
            ${date.toLocaleDateString('es-AR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            &nbsp;·&nbsp; ${this._escapeHtml(event.venue)}
          </p>
          <div class="admin-stats">
            <span class="stat" style="background:var(--seat-avail-bg);color:var(--seat-avail)">Estado: ${event.status || '—'}</span>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn-sm" onclick="UI.renderView('event-detail', { eventId: '${event.id}' })">Ver mapa</button>
          <button class="btn-sm" onclick="UI.renderView('admin-form', { eventId: '${event.id}' })">Editar</button>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     FORMULARIO DE EVENTO (Admin)
     ---------------------------------------------------------- */
  async _buildEventForm(eventId) {
    const event  = eventId ? await Events.getById(eventId) : null;
    const isEdit = !!event;

    // Fecha en formato datetime-local
    const dateVal = event
      ? new Date(event.eventDate || event.date).toISOString().slice(0, 16)
      : '';

    return `
      <div class="page-header">
        <button class="btn-back" onclick="UI.renderView('admin')">← Volver al panel</button>
        <h1 class="page-title">${isEdit ? 'Editar' : 'Nuevo'} <span class="accent">Evento</span></h1>
      </div>

      <div class="form-container">
        <div class="form-card">

          <div class="form-row">
            <div class="form-group">
              <label for="f-name">Nombre del evento *</label>
              <input type="text" id="f-name" value="${this._escapeHtml(event?.name || '')}" placeholder="Ej: Los Redondos" />
            </div>
          </div>

          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label for="f-date">Fecha y hora *</label>
              <input type="datetime-local" id="f-date" value="${dateVal}" />
            </div>
            <div class="form-group">
              <label for="f-venue">Lugar *</label>
              <input type="text" id="f-venue" value="${this._escapeHtml(event?.venue || '')}" placeholder="Teatro, estadio, etc." />
            </div>
          </div>

          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label for="f-status">Estado</label>
              <select id="f-status">
                <option value="Active" ${event?.status === 'Active' ? 'selected' : ''}>Activo</option>
                <option value="Inactive" ${event?.status === 'Inactive' ? 'selected' : ''}>Inactivo</option>
                <option value="Cancelled" ${event?.status === 'Cancelled' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          </div>

          <div class="form-actions" style="margin-top:24px">
            <button class="btn-secondary" type="button" onclick="UI.renderView('admin')">Cancelar</button>
            <button class="btn-primary" type="button" id="btn-save-event">
              ${isEdit ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>

        </div>
      </div>
    `;
  },

  _attachFormListeners(eventId) {
    const saveBtn = document.getElementById('btn-save-event');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._saveEvent(eventId));
    }
  },

  async _saveEvent(eventId) {
    const name   = document.getElementById('f-name')?.value.trim() || '';
    const date   = document.getElementById('f-date')?.value || '';
    const venue  = document.getElementById('f-venue')?.value.trim() || '';
    const status = document.getElementById('f-status')?.value || 'Active';

    if (!name || !date || !venue) {
      this.showToast('Completá los campos obligatorios: nombre, fecha y lugar.', 'error');
      return;
    }

    const data = { name, date, venue, status };

    if (eventId) {
      await Events.update(eventId, data);
      this.showToast('Evento actualizado (pendiente de endpoint backend).', 'info');
    } else {
      const created = await Events.create(data);
      if (created) {
        this.showToast(`Evento "${created.name}" creado correctamente.`, 'success');
      } else {
        this.showToast('Error al crear el evento. Revisá la conexión con el backend.', 'error');
        return;
      }
    }

    this.renderView('admin');
  },

  /* ----------------------------------------------------------
     VISTA: AUDITORÍA
     ---------------------------------------------------------- */
  _buildAuditLogs() {
    const allLogs = Audit.getLogs().slice().reverse();

    const actionStyle = {
      [ACTION.RESERVE_SUCCESS]: 'success',
      [ACTION.RESERVE_FAIL]:    'error',
      [ACTION.PURCHASE]:        'purchase',
      [ACTION.RELEASE]:         'warning',
      [ACTION.UNLOCK]:          'info',
    };

    const users = [...new Set(allLogs.map(l => l.user))].sort();

    return `
      <div class="page-header">
        <button class="btn-back" onclick="UI.renderView('admin')">← Volver al panel</button>
        <h1 class="page-title">Registro de <span class="accent">Auditoría</span></h1>
        <p class="page-subtitle">${allLogs.length} entradas registradas · Solo lectura · Inmutable</p>
      </div>

      <div class="audit-filters">
        <input
          type="search"
          id="audit-search"
          placeholder="Buscar por usuario o butaca..."
          oninput="UI.filterAuditLogs()"
          aria-label="Buscar en auditoría"
        />
        <select id="audit-action-filter" onchange="UI.filterAuditLogs()" aria-label="Filtrar por acción">
          <option value="">Todas las acciones</option>
          ${Object.values(ACTION).map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
        <select id="audit-user-filter" onchange="UI.filterAuditLogs()" aria-label="Filtrar por usuario">
          <option value="">Todos los usuarios</option>
          ${users.map(u => `<option value="${this._escapeHtml(u)}">${this._escapeHtml(u)}</option>`).join('')}
        </select>
        <span class="audit-count" id="audit-count">${allLogs.length} registros</span>
      </div>

      <div class="audit-table-wrap">
        <table class="audit-table" aria-label="Registro de auditoría">
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              <th scope="col">Usuario</th>
              <th scope="col">Acción</th>
              <th scope="col">Butaca / Recurso</th>
            </tr>
          </thead>
          <tbody id="audit-tbody">
            ${this._renderAuditRows(allLogs, actionStyle)}
          </tbody>
        </table>
      </div>
    `;
  },

  _renderAuditRows(logs, actionStyle) {
    const actionStyleMap = actionStyle || {
      [ACTION.RESERVE_SUCCESS]: 'success',
      [ACTION.RESERVE_FAIL]:    'error',
      [ACTION.PURCHASE]:        'purchase',
      [ACTION.RELEASE]:         'warning',
      [ACTION.UNLOCK]:          'info',
    };
    if (!logs.length) {
      return '<tr><td colspan="4" class="empty-cell">No hay registros que coincidan con el filtro.</td></tr>';
    }
    return logs.map(log => `
      <tr class="audit-row ${actionStyleMap[log.action] || ''}">
        <td class="audit-ts">${new Date(log.timestamp).toLocaleString('es-AR')}</td>
        <td>${this._escapeHtml(log.user)}</td>
        <td><span class="action-badge ${actionStyleMap[log.action] || ''}">${log.action}</span></td>
        <td class="audit-resource" title="${this._escapeHtml(log.resource?.seatId || '—')}">
          ${this._escapeHtml(log.resource?.seatId || '—')}
        </td>
      </tr>
    `).join('');
  },

  filterAuditLogs() {
    const query     = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const actionFlt = document.getElementById('audit-action-filter')?.value || '';
    const userFlt   = document.getElementById('audit-user-filter')?.value   || '';
    const tbody     = document.getElementById('audit-tbody');
    const countEl   = document.getElementById('audit-count');

    if (!tbody) return;

    let logs = Audit.getLogs().slice().reverse().filter(log => {
      if (actionFlt && log.action !== actionFlt) return false;
      if (userFlt   && log.user   !== userFlt)   return false;
      if (query) {
        const haystack = `${log.user} ${log.resource?.seatId || ''} ${log.action}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    tbody.innerHTML = this._renderAuditRows(logs);
    if (countEl) countEl.textContent = `${logs.length} registro${logs.length !== 1 ? 's' : ''}`;
  },

  /* ----------------------------------------------------------
     TOASTS
     ---------------------------------------------------------- */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span>${this._escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" aria-label="Cerrar notificación">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  /* ----------------------------------------------------------
     UTILIDADES
     ---------------------------------------------------------- */
  _escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};


/* ============================================================
   BACKGROUND — Liberación automática
   ============================================================ */
const Background = {
  start() {
    setInterval(() => {
      const released = Seats.releaseExpired();
      if (released > 0) {
        console.log(`[Background] ${released} butaca(s) liberada(s) por timeout.`);
        UI._refreshSeatMap();

        const now     = Date.now();
        const expired = UI.selectedSeats.filter(s => s.lockExpiry <= now);
        if (expired.length) {
          UI.selectedSeats = UI.selectedSeats.filter(s => s.lockExpiry > now);
          UI._updateSelectionPanel();
          UI.showToast(
            `⏰ ${expired.length} butaca${expired.length > 1 ? 's' : ''} liberada${expired.length > 1 ? 's' : ''} por tiempo de espera.`,
            'warning'
          );
        }
      }
    }, RELEASE_CHECK_MS);
  },
};