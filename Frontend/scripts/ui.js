
'use strict';

const UI = {
  currentView:     null,
  currentEventId:  null,
  currentSectorId: null,

  selectedSeats: [],

  // ─── Inicialización ───────────────────────────────────────────────

  init() {
    this._setupNav();
    this._setupTheme();
    this.renderView('home');
    this._updateSelectionPanel();
  },

  // ─── Navbar ───────────────────────────────────────────────────────

  _setupNav() {
    const user = Auth.currentUser;

    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.renderView(view);
      });
    });

    console.log('Usuario actual:', Auth.getUser());
    console.log('Es admin?:', Auth.isAdmin());

    if (Auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
    if (!Auth.isAdmin()) {
      document.querySelectorAll('.client-only').forEach(el => el.classList.remove('hidden'));
    }

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('nav-username',     user?.username || '');
    set('user-avatar-char', (user?.username || 'U').charAt(0).toUpperCase());
    set('dd-username', user?.username || '');
    set('dd-email',    user?.email    || '');
    set('dd-role',     user?.role === 'admin' ? 'Administrador' : 'Cliente');

    const userBtn      = document.getElementById('btn-user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', e => {
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

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      Auth.logout();
      location.reload();
    });

    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', e => {
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

    document.getElementById('btn-theme-mobile')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      Store.set('theme', next);
      const icon = document.querySelector('.theme-icon');
      if (icon) icon.textContent = next === 'dark' ? '☀' : '🌙';
      this.closeMobileNav();
    });

    document.getElementById('btn-purchase')?.addEventListener('click', () => this._handlePurchase());
    document.getElementById('btn-clear-selection')?.addEventListener('click', () => this._handleCancelSelection());

    this._initScrollTop();
  },

  closeMobileNav() {
    document.getElementById('mobile-nav')?.classList.add('hidden');
    document.getElementById('hamburger-btn')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
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
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  _setupTheme() {
    const saved = Store.get('theme', 'dark');
    document.documentElement.dataset.theme = saved;
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = saved === 'dark' ? '☀' : '🌙';

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      Store.set('theme', next);
      if (icon) icon.textContent = next === 'dark' ? '☀' : '🌙';
    });
  },

  // ─── Router de vistas ─────────────────────────────────────────────

  async renderView(view, params = {}) {
    this.currentView = view;
    const main = document.getElementById('main-content');
    if (!main) return;

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

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
          html = await this._buildAuditLogs();  // ← agregar await
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

  // ─── Vista Home ───────────────────────────────────────────────────

  async _buildHome() {
    const events = await Events.getAll();
    const list   = Array.isArray(events) ? events : [];

    if (!list.length) {
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
          <input type="search" id="search-input" placeholder="Buscar evento o lugar..."
            autocomplete="off" aria-label="Buscar eventos" oninput="UI.filterEvents()" />
          <button class="search-clear hidden" id="search-clear"
            onclick="UI.clearSearch()" aria-label="Limpiar búsqueda">✕</button>
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

  async filterEvents() {
    const query  = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const genre  = document.getElementById('filter-genre')?.value  || '';
    const grid   = document.getElementById('events-grid');
    const count  = document.getElementById('results-count');
    const clearX = document.getElementById('search-clear');
    if (!grid) return;
    if (clearX) clearX.classList.toggle('hidden', !query);

    const events  = await Events.getAll();
    const list    = Array.isArray(events) ? events : [];
    const matched = list.filter(e => {
      if (query && !e.name?.toLowerCase().includes(query) && !e.venue?.toLowerCase().includes(query)) return false;
      if (genre && e.genre !== genre) return false;
      return true;
    });

    grid.innerHTML = matched.length
      ? matched.map(e => this._buildEventCard(e)).join('')
      : `<div class="no-results">
           <span class="nr-icon">🔍</span>
           <p>No encontramos eventos con esos filtros.</p>
           <button class="btn-ghost" onclick="UI.resetFilters()">Limpiar filtros</button>
         </div>`;

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
    ['search-input', 'filter-genre', 'filter-avail'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.filterEvents();
  },

  _buildEventCard(event) {
    const date     = new Date(event.eventDate || event.date);
    const minPrice = event.minPrice ?? event.price ?? 0;
    return `
      <article class="event-card" role="button" tabindex="0"
        aria-label="Ver butacas para ${this._escapeHtml(event.name)}"
        onclick="UI.renderView('event-detail', { eventId: '${event.id}' })"
        onkeydown="if(event.key==='Enter')UI.renderView('event-detail',{eventId:'${event.id}'})">
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
            <span class="avail-text">Ver disponibilidad</span>
          </div>
          ${minPrice > 0 ? `<div class="card-price">Desde <strong>$${minPrice.toLocaleString('es-AR')}</strong></div>` : ''}
          <button class="btn-card" tabindex="-1">Ver butacas →</button>
        </div>
      </article>
    `;
  },

  // ─── Vista Detalle de Evento ──────────────────────────────────────

  async _buildEventDetail(eventId) {
    const event = await Events.getById(eventId);
    if (!event) return '<div class="error-state">Evento no encontrado.</div>';

    const sectors  = await Events.getSectorsByEvent(eventId);
    const seatsAll = await Events.getSeatsByEvent(eventId);

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

    if (!this.currentSectorId || !event.sectors.find(s => Number(s.id) === Number(this.currentSectorId))) {
      this.currentSectorId = Number(event.sectors[0]?.id) || null;
    }

    const sector = event.sectors.find(s => Number(s.id) === Number(this.currentSectorId));
    const date   = new Date(event.eventDate || event.date);

    const sectorStats = event.sectors.map(s => {
      const total  = s.seats.length;
      const sold   = s.seats.filter(se => se.status === SEAT.SOLD).length;
      const locked = s.seats.filter(se => se.status === SEAT.LOCKED).length;
      const free   = total - sold - locked;
      const pct    = total > 0 ? Math.round(((sold + locked) / total) * 100) : 0;
      const fill   = pct < 40 ? 'low' : pct < 75 ? 'medium' : 'high';
      return { ...s, total, sold, locked, free, pct, fill };
    });

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

          <div class="sector-stats" aria-label="Disponibilidad por sector">
            ${sectorStats.map(s => `
              <div class="sector-stat-row">
                <span class="ss-label">${this._escapeHtml(s.name)}</span>
                <div class="ss-bar-wrap">
                  <div class="ss-bar-fill ${s.fill}" style="width:${s.pct}%"></div>
                </div>
                <span class="ss-numbers">${s.free} / ${s.total}</span>
                <span class="ss-price">$${s.price.toLocaleString('es-AR')}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="seat-section">
          <div class="sector-tabs" role="tablist">
            ${event.sectors.map(s => {
              const ss      = sectorStats.find(x => x.id === s.id);
              const soldOut = ss && ss.free === 0;
              return `
                <button class="sector-tab ${Number(s.id) === Number(this.currentSectorId) ? 'active' : ''}"
                  role="tab" aria-selected="${Number(s.id) === Number(this.currentSectorId)}"
                  onclick="UI.switchSector('${eventId}', '${s.id}')">
                  ${this._escapeHtml(s.name)} — $${s.price.toLocaleString('es-AR')}
                  ${soldOut ? '<span class="new-badge" style="color:var(--seat-sold-light)">Agotado</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div class="seat-map-container" role="tabpanel">
            <div class="stage-label" aria-hidden="true">▲ ESCENARIO ▲</div>
            <div class="seat-legend" role="list">
              <span class="legend-item"><span class="dot available"></span> Disponible</span>
              <span class="legend-item"><span class="dot locked"></span> Reservado</span>
              <span class="legend-item"><span class="dot sold"></span> Vendido</span>
              <span class="legend-item"><span class="dot selected"></span> Tu selección</span>
            </div>
            <div class="seat-map" id="seat-map" aria-label="Mapa de butacas">
              ${UISeats.buildGrid(event, sector)}
            </div>
            <p class="sector-info" id="sector-info">
              Sector: <strong>${this._escapeHtml(sector?.name || '')}</strong> &middot;
              ${sector?.seats?.filter(s => s.status === SEAT.AVAILABLE).length || 0} de ${sector?.seats?.length || 0} disponibles
            </p>
          </div>
        </div>
      </div>
    `;
  },

  switchSector(eventId, sectorId) {
    this.currentSectorId = Number(sectorId);
    this.renderView('event-detail', { eventId });
  },

  // ─── Panel de selección ───────────────────────────────────────────

  /**
   * Actualizar el panel lateral con las butacas seleccionadas.
   * Si no hay butacas → ocultar panel y parar timer.
   * Si hay butacas → mostrar panel y arrancar timer via UITimer.start().
   */
_updateSelectionPanel() {
    const panel   = document.getElementById('selection-panel');
    if (!panel) return; // Primero validamos que el panel exista

    const listEl  = document.getElementById('selection-list');
    const totalEl = document.getElementById('selection-total-amount');
    const countEl = document.getElementById('selection-count');
 

    // 2. Si no hay asientos, ocultamos y salimos
    if (!this.selectedSeats.length) {
      panel.classList.add('hidden');
      if (typeof UITimer !== 'undefined') UITimer.stop();
      return;
    }

    // 3. Mostramos el panel y renderizamos la lista
    panel.classList.remove('hidden');

    if (listEl) {
      listEl.innerHTML = this.selectedSeats.map(s => `
        <div class="selection-item" role="listitem">
          <div class="sel-info">
            <strong>${this._escapeHtml(s.seatLabel)}</strong>
            <span>${this._escapeHtml(s.sectorName)} · ${this._escapeHtml(s.eventName)}</span>
          </div>
          <span class="sel-price">$${s.price.toLocaleString('es-AR')}</span>
          <button class="sel-remove" aria-label="Quitar ${s.seatLabel}"
            onclick="UI.removeSeat('${s.seatId}')">✕</button>
        </div>
      `).join('');
    }

    // 4. Totales y Timer
    const total = this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-AR')}`;
    if (countEl) countEl.textContent = `${this.selectedSeats.length} butaca${this.selectedSeats.length !== 1 ? 's' : ''}`;

    if (typeof UITimer !== 'undefined') UITimer.start();
  },
async removeSeat(seatId) {
    const idx = this.selectedSeats.findIndex(s => s.seatId === seatId);
    if (idx < 0) return;

    const seatToRemove = this.selectedSeats[idx];
    
    // IMPORTANTE: Necesitamos el reservationId que devolvió el POST al crear
    if (!seatToRemove.reservationId) {
        console.error("No hay ID de reserva para esta butaca");
        this.selectedSeats.splice(idx, 1); // La quitamos igual de la lista local
        this._updateSelectionPanel();
        return;
    }

    try {
      const userId = Auth.getUserId();
      await Reservations.cancel(seatToRemove.reservationId, Number(userId));

      this.selectedSeats.splice(idx, 1);
      await this._refreshSeatMap();
      this._updateSelectionPanel();
      
      this.showToast('Butaca liberada.', 'info');
    } catch (err) {
      // Si el error es "No puedes cancelar", igual refrescamos el mapa
      await this._refreshSeatMap();
      this.showToast('Error al liberar: ' + err.message, 'error');
    }
},

  async clearSelection() {
    if (!this.selectedSeats.length) return;

    try {
      const userId = Auth.getUserId();
      this.showToast('Liberando todas las butacas...', 'info');

      // 1. Creamos una lista de promesas para cancelar todas en paralelo
      const cancelPromises = this.selectedSeats.map(seat => 
        Reservations.cancel(seat.reservationId, Number(userId))
      );

      // 2. Esperamos a que el servidor procese todas
      await Promise.all(cancelPromises);

      // 3. Limpiamos localmente
      this.selectedSeats = [];
      
      await this._refreshSeatMap();
      this._updateSelectionPanel();
      
      this.showToast('Selección cancelada y butacas liberadas.', 'success');

    } catch (err) {
      console.error('[UI] Error al limpiar selección:', err);
      this.showToast('Hubo un error al intentar liberar las butacas.', 'error');
      
      // Opcional: refrescar de todos modos para sincronizar estados
      await this._refreshSeatMap();
      this._updateSelectionPanel();
    }
  },

  /** Alias público para que UITimer pueda llamar al refresh del mapa */
  async _refreshSeatMap() {
    // Asegurate de que UISeats.refresh() vuelva a pedir los datos a la API
    await UISeats.refresh();
  },

  // ─── Compra ───────────────────────────────────────────────────────

  async _handlePurchase() {

  if (!this.selectedSeats.length)
    return;

  try {

    const userId = Auth.getUserId();

    for (const seat of this.selectedSeats) {

      await Reservations.confirm(
        seat.reservationId,
        Number(userId)
      );
    }

    const count =
      this.selectedSeats.length;

    this.selectedSeats = [];

    UITimer.stop();

    this._updateSelectionPanel();

    await this._refreshSeatMap();

    this._showPurchaseModal(count);

  } catch (err) {

    console.error(
      '[UI] Error al confirmar compra:',
      err
    );

    this.showToast(
      'Error al confirmar compra.',
      'error'
    );
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
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn-primary"
              onclick="document.getElementById('modal-root').innerHTML=''">¡Genial!</button>
            <button class="btn-secondary"
              onclick="document.getElementById('modal-root').innerHTML='';UI.renderView('my-tickets')">
              Ver mis entradas
            </button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => { if (root) root.innerHTML = ''; }, 10000);
  },
// ─── Cancelación de Selección ──────────────────────────────────────
 async _handleCancelSelection() {
    if (!this.selectedSeats.length) return;

    try {
      const userId = Auth.getUserId();
      // Usamos Number() para asegurar que enviamos un entero limpio
      const cleanUserId = Number(userId); 

      const cancelPromises = this.selectedSeats.map(seat => 
        Reservations.cancel(seat.reservationId, cleanUserId)
      );

      await Promise.all(cancelPromises);

      this.selectedSeats = [];
      if (typeof UITimer !== 'undefined') UITimer.stop();

      await this._refreshSeatMap();
      this._updateSelectionPanel();

      this.showToast('Selección liberada.', 'success');

    } catch (err) {
      console.error('[UI] Error al cancelar selección:', err);
      // Si falla, refrescamos igual para ver qué quedó en la DB
      await this._refreshSeatMap();
    }
  }, 
 
  // ─── Mis entradas ─────────────────────────────────────────────────

  async _buildMyTickets() {
    try {
      const reservations = await Reservations.getByUser(Auth.getUser().id);
      const list = Array.isArray(reservations) ? reservations : [];

      if (!list.length) {
        return `
          <div class="page-header">
            <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
          </div>
          <div class="empty-state">
            <div class="empty-icon">🎟️</div>
            <p>Todavía no tenés reservas.</p>
            <button class="btn-primary" onclick="UI.renderView('home')">Ver eventos disponibles</button>
          </div>
        `;
      }

      return `
        <div class="page-header">
          <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
          <p class="page-subtitle">${list.length} reserva${list.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="tickets-list">
          ${list.map(r => this._buildReservationCard(r)).join('')}
        </div>
      `;
    } catch {
      return `
        <div class="page-header">
          <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
        </div>
        <div class="empty-state">
          <div class="empty-icon">🎟️</div>
          <p>Todavía no tenés reservas.</p>
          <button class="btn-primary" onclick="UI.renderView('home')">Ver eventos disponibles</button>
        </div>
      `;
    }
  },

  _buildReservationCard(reservation) {
    const expiry = reservation.expiresAt
      ? new Date(reservation.expiresAt).toLocaleString('es-AR')
      : '—';
    return `
      <div class="ticket-card" role="article">
        <div class="ticket-main">
          <div class="ticket-title">Reserva #${String(reservation.id || '').slice(-8) || '?'}</div>
          <div class="ticket-detail">
            <span>Estado: <strong>${reservation.status || '—'}</strong></span>
          </div>
          <div class="ticket-venue">Expira: ${expiry}</div>
        </div>
      </div>
    `;
  },

  // ─── Panel admin ──────────────────────────────────────────────────

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

      <div class="dashboard-stats" aria-label="Estadísticas generales">
        <div class="dash-card accent-gold">
          <span class="dash-icon">📅</span>
          <span class="dash-value">${list.length}</span>
          <span class="dash-label">Eventos activos</span>
        </div>
        <div class="dash-card accent-green">
          <span class="dash-icon">📋</span>
          <span class="dash-value">${logs.length}</span>
          <span class="dash-label">Acciones auditadas</span>
        </div>
      </div>

      <div class="admin-section-tabs">
        <button class="admin-tab-btn active">Eventos (${list.length})</button>
      </div>

      <div class="admin-events">
        ${list.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📅</div><p>No hay eventos creados.</p></div>'
          : list.map(e => this._buildAdminEventRow(e)).join('')
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
            <span class="stat available">Estado: ${event.status || '—'}</span>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn-sm" onclick="UI.renderView('event-detail', { eventId: '${event.id}' })">Ver mapa</button>
          <button class="btn-sm" onclick="UI.renderView('admin-form', { eventId: '${event.id}' })">Editar</button>
        </div>
      </div>
    `;
  },

  async _buildEventForm(eventId) {
    const event   = eventId ? await Events.getById(eventId) : null;
    const isEdit  = !!event;
    const dateVal = event ? new Date(event.eventDate || event.date).toISOString().slice(0, 16) : '';

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
              <input type="text" id="f-name"
                value="${this._escapeHtml(event?.name || '')}"
                placeholder="Ej: Los Redondos" />
            </div>
          </div>
          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label for="f-date">Fecha y hora *</label>
              <input type="datetime-local" id="f-date" value="${dateVal}" />
            </div>
            <div class="form-group">
              <label for="f-venue">Lugar *</label>
              <input type="text" id="f-venue"
                value="${this._escapeHtml(event?.venue || '')}"
                placeholder="Teatro, estadio, etc." />
            </div>
          </div>
          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label for="f-status">Estado</label>
              <select id="f-status">
                <option value="Active"    ${event?.status === 'Active'    ? 'selected' : ''}>Activo</option>
                <option value="Inactive"  ${event?.status === 'Inactive'  ? 'selected' : ''}>Inactivo</option>
                <option value="Cancelled" ${event?.status === 'Cancelled' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          </div>
          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label>Sectores</label>
              <div id="sectors-container">
                <div class="sector-item" data-index="0">
                  <input type="text"   class="s-name"  placeholder="Nombre (ej: Campo)"  />
                  <input type="number" class="s-rows"  placeholder="Filas"   min="1" />
                  <input type="number" class="s-cols"  placeholder="Columnas" min="1" />
                  <input type="number" class="s-price" placeholder="Precio"  min="0" />
                  <button type="button" onclick="UI._removeSector(this)">✕</button>
                </div>
              </div>
              <button type="button" class="btn-ghost" onclick="UI._addSector()" style="margin-top:8px">
                + Agregar sector
              </button>
            </div>
          </div>
          <div class="form-actions" style="margin-top:24px">
            <button class="btn-secondary" type="button" onclick="UI.renderView('admin')">Cancelar</button>
            <button class="btn-primary"   type="button" id="btn-save-event">
              ${isEdit ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _attachFormListeners(eventId) {
    document.getElementById('btn-save-event')
      ?.addEventListener('click', () => this._saveEvent(eventId));
  },

  async _saveEvent(eventId) {
    const name   = document.getElementById('f-name')?.value.trim()  || '';
    const date   = document.getElementById('f-date')?.value          || '';
    const venue  = document.getElementById('f-venue')?.value.trim() || '';
    const status = document.getElementById('f-status')?.value        || 'Active';

    if (!name || !date || !venue) {
      this.showToast('Completá los campos obligatorios: nombre, fecha y lugar.', 'error');
      return;
    }

    try {
      const sectorItems = document.querySelectorAll('.sector-item');
      const sectors = Array.from(sectorItems).map(item => ({
        name:     item.querySelector('.s-name')?.value.trim()   || '',
        rows:     Number(item.querySelector('.s-rows')?.value)  || 5,
        cols:     Number(item.querySelector('.s-cols')?.value)  || 10,
        price:    Number(item.querySelector('.s-price')?.value) || 0,
        capacity: (Number(item.querySelector('.s-rows')?.value) || 5) *
                  (Number(item.querySelector('.s-cols')?.value) || 10),
      })).filter(s => s.name);

      if (!sectors.length) {
        this.showToast('Agregá al menos un sector con nombre.', 'error');
        return;
      }

      if (eventId) {
        await Events.update(eventId, { name, eventDate: date, venue, status });
        this.showToast('Evento actualizado correctamente.', 'success');
      } else {
        const created = await Events.create({ name, eventDate: date, venue, status, sectors });
        this.showToast(`Evento "${created.name}" creado.`, 'success');
      }
      await this.renderView('admin');
      } catch (error) {
            this.showToast(error.message || 'Error al guardar el evento.', 'error');
    }
  },
  _addSector() {
  const container = document.getElementById('sectors-container');
  const div = document.createElement('div');
  div.className = 'sector-item';
  div.innerHTML = `
    <input type="text"   class="s-name"  placeholder="Nombre (ej: Platea)" />
    <input type="number" class="s-rows"  placeholder="Filas"    min="1" />
    <input type="number" class="s-cols"  placeholder="Columnas" min="1" />
    <input type="number" class="s-price" placeholder="Precio"   min="0" />
    <button type="button" onclick="UI._removeSector(this)">✕</button>
  `;
  container.appendChild(div);
},

_removeSector(btn) {
  const container = document.getElementById('sectors-container');
  if (container.children.length > 1) btn.parentElement.remove();
},

  // ─── Auditoría ────────────────────────────────────────────────────
  async _fetchAuditLogs() {
  try {
    const token = Auth.getToken();
    const res = await fetch(`${API_BASE_URL}/AuditLogs`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
},
  async _buildAuditLogs() {
    const allLogs = await this._fetchAuditLogs();
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
        <p class="page-subtitle">${allLogs.length} entradas registradas</p>
      </div>
      <div class="audit-filters">
        <input type="search" id="audit-search" placeholder="Buscar..."
          oninput="UI.filterAuditLogs()" />
        <select id="audit-action-filter" onchange="UI.filterAuditLogs()">
          <option value="">Todas las acciones</option>
          ${Object.values(ACTION).map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
        <select id="audit-user-filter" onchange="UI.filterAuditLogs()">
          <option value="">Todos los usuarios</option>
          ${users.map(u => `<option value="${this._escapeHtml(u)}">${this._escapeHtml(u)}</option>`).join('')}
        </select>
        <span class="audit-count" id="audit-count">${allLogs.length} registros</span>
      </div>
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th><th>Usuario</th><th>Acción</th><th>Recurso</th>
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
    const map = actionStyle || {};
    if (!logs.length) return '<tr><td colspan="4" class="empty-cell">No hay registros.</td></tr>';
    return logs.map(log => `
      <tr class="audit-row ${map[log.action] || ''}">
      <td class="audit-ts">${new Date(log.createdAt).toLocaleString('es-AR')}</td>
      <td>${this._escapeHtml(String(log.userId || 'sistema'))}</td>
      <td class="audit-resource">${this._escapeHtml(log.entityId || '—')}</td>
      <td class="audit-resource">${this._escapeHtml(log.resource?.seatId || '—')}</td>
      </tr>
    `).join('');
  },

  filterAuditLogs() {
    const query     = (document.getElementById('audit-search')?.value     || '').toLowerCase();
    const actionFlt = document.getElementById('audit-action-filter')?.value || '';
    const userFlt   = document.getElementById('audit-user-filter')?.value   || '';
    const tbody     = document.getElementById('audit-tbody');
    const countEl   = document.getElementById('audit-count');
    if (!tbody) return;

    const logs = Audit.getLogs().slice().reverse().filter(log => {
      if (actionFlt && log.action !== actionFlt) return false;
      if (userFlt   && log.user   !== userFlt)   return false;
      if (query) {
        const hay = `${log.user} ${log.resource?.seatId || ''} ${log.action}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    tbody.innerHTML = this._renderAuditRows(logs);
    if (countEl) countEl.textContent = `${logs.length} registro${logs.length !== 1 ? 's' : ''}`;
  },

  // ─── Toasts ───────────────────────────────────────────────────────

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span>${this._escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  // ─── Utilidades ───────────────────────────────────────────────────

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

// ─── Background Worker ────────────────────────────────────────────────────────

const Background = {
  start() {
    // Polling existente para reservas expiradas
    setInterval(async () => {
      try {
        await Seats.releaseExpired();
      } catch { }
    }, RELEASE_CHECK_MS);

    // ← AGREGAR ESTO: refrescar el mapa cada 15s para sincronizar con otros usuarios
    setInterval(async () => {
      if (UI.currentView === 'event-detail') {
        await UISeats.refresh();
      }
    }, 15_000);
  },
};