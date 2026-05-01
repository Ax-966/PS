/**
 * TicketVivo — ui.js
 * Módulo UI: renderizado de vistas, manejo de interacciones, panel de selección,
 * temporizador regresivo, toasts y proceso en segundo plano (Background).
 * Depende de: constants.js, store.js, audit.js, auth.js, events.js
 *
 * ORDEN DE CARGA: constants.js → store.js → audit.js → auth.js → events.js → ui.js → main.js
 */

'use strict';

/* ============================================================
   MÓDULO UI — Renderizado de vistas y manejo de interacciones
   ============================================================ */
const UI = {
  currentView:     null,
  currentEventId:  null,
  currentSectorId: null,

  /** Butacas seleccionadas en el carrito */
  selectedSeats: [], // [{ eventId, sectorId, seatId, seatLabel, sectorName, eventName, price, lockExpiry }]

  /** ID del intervalo del temporizador visible */
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

    // ── Links de navegación (navbar + mobile) ──
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;
        this.renderView(view);
      });
    });

    // ── Admin links ──
    if (Auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    // ── Poblar info del dropdown de usuario ──
    const usernameEl  = document.getElementById('nav-username');
    const avatarEl    = document.getElementById('user-avatar-char');
    const ddUsername  = document.getElementById('dd-username');
    const ddEmail     = document.getElementById('dd-email');
    const ddRole      = document.getElementById('dd-role');

    if (usernameEl)  usernameEl.textContent  = user?.username || '';
    if (avatarEl)    avatarEl.textContent     = (user?.username || 'U').charAt(0).toUpperCase();
    if (ddUsername)  ddUsername.textContent   = user?.username || '';
    if (ddEmail)     ddEmail.textContent      = user?.email || '';
    if (ddRole)      ddRole.textContent       = user?.role === 'admin' ? 'Administrador' : 'Cliente';

    // ── Toggle dropdown de usuario ──
    const userBtn      = document.getElementById('btn-user-menu');
    const userDropdown = document.getElementById('user-dropdown');

    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !userDropdown.classList.contains('hidden');
        userDropdown.classList.toggle('hidden', open);
        userBtn.setAttribute('aria-expanded', String(!open));
      });
      // Cerrar al clickear fuera
      document.addEventListener('click', () => {
        userDropdown.classList.add('hidden');
        userBtn?.setAttribute('aria-expanded', 'false');
      });
    }

    // ── Logout ──
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
        location.reload();
      });
    }

    // ── Hamburguesa mobile ──
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

    // Botón de tema mobile
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

    // ── Botón de compra en panel ──
    const purchaseBtn = document.getElementById('btn-purchase');
    if (purchaseBtn) purchaseBtn.addEventListener('click', () => this._handlePurchase());

    // ── Botón cancelar selección ──
    const clearBtn = document.getElementById('btn-clear-selection');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

    // ── Botón scroll-to-top ──
    this._initScrollTop();
  },

  /** Cerrar menú mobile programáticamente. */
  closeMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    const hamburger = document.getElementById('hamburger-btn');
    mobileNav?.classList.add('hidden');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
  },

  /** Cerrar dropdown de usuario. */
  closeUserMenu() {
    document.getElementById('user-dropdown')?.classList.add('hidden');
    document.getElementById('btn-user-menu')?.setAttribute('aria-expanded', 'false');
  },

  /** Inicializar botón de scroll-to-top. */
  _initScrollTop() {
    // Crear botón
    const btn = document.createElement('button');
    btn.className  = 'scroll-top-btn no-print';
    btn.innerHTML  = '↑';
    btn.title      = 'Volver arriba';
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
     ROUTER DE VISTAS
     ---------------------------------------------------------- */
  /**
   * Renderizar una vista en el contenedor principal.
   * @param {string} view   - Nombre de la vista
   * @param {Object} params - Parámetros opcionales (ej: { eventId })
   */
  async renderView(view, params = {}) {
    this.currentView = view;
    const main = document.getElementById('main-content');
    if (!main) return;

    // Marcar link activo en navbar
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Renderizar según la vista solicitada
    let html = '';
    switch (view) {
      case 'home':
        html = await this._buildHome();
        break;
      case 'event-detail':
        this.currentEventId  = params.eventId;
        if (!this.currentSectorId) {
          const ev = await Events.getById(params.eventId);
          this.currentSectorId = ev?.sectors?.[0]?.id || null;
        }
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
        html = await this._buildAuditLogs();
        break;
      default:
        html = '<div class="error-state">Vista no encontrada.</div>';
    }

    main.innerHTML = `<div class="page-enter">${html}</div>`;

    // Ejecutar scripts de inicialización específicos de la vista
    if (view === 'admin-form') this._attachFormListeners(params.eventId || null);
  },

  /* ----------------------------------------------------------
     VISTA: HOME — Listado de eventos + buscador/filtros
     ---------------------------------------------------------- */
  async _buildHome() {
  const events = await Events.getAll();

  if (events.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">🎸</div>
        <p>No hay eventos disponibles aún.</p>
        ${Auth.isAdmin() ? '<button class="btn-primary" onclick="UI.renderView(\'admin-form\', {})">Crear primer evento</button>' : ''}
      </div>
    `;
  }


    // Obtener géneros únicos para el filtro
    const genres = [...new Set(events.map(e => e.genre).filter(Boolean))].sort();

    return `
      <div class="page-header">
        <h1 class="page-title">Próximos <span class="accent">Eventos</span></h1>
        <p class="page-subtitle">Conseguí tus entradas antes de que se agoten</p>
      </div>

      <!-- Barra de búsqueda y filtros -->
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
        ${events.map(e => this._buildEventCard(e)).join('')}
      </div>
    `;
  },

  /** Filtrar eventos según los valores de búsqueda actuales. */
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
   console.log('Eventos recibidos:', events);

let matched = events.filter(e => {
  if (query && !e.name.toLowerCase().includes(query) && !e.venue.toLowerCase().includes(query)) return false;
  if (genre && e.genre !== genre) return false;
  if (avail) {
    const total = e.sectors.reduce((s, sec) => s + sec.seats.length, 0);
    const sold  = e.sectors.reduce((s, sec) => s + sec.seats.filter(se => se.status === SEAT.SOLD).length, 0);
    const locked= e.sectors.reduce((s, sec) => s + sec.seats.filter(se => se.status === SEAT.LOCKED).length, 0);
    const free  = total - sold - locked;
    if (avail === 'available' && free === 0) return false;
    if (avail === 'sold'      && free > 0)   return false;
  }
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
      count.innerHTML = matched.length < events.length
        ? `Mostrando <strong>${matched.length}</strong> de <strong>${events.length}</strong> eventos`
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

  _buildEventCard(event) {
    // Verificar que el evento tenga sectores válidos
   if (!event.sectors || !Array.isArray(event.sectors) || event.sectors.length === 0) {
    // Mostrar igual aunque no tenga sectores
}

    const date = new Date(event.eventDate || event.date);
    const totalSeats  = (event.sectors || []).reduce((sum, s) => sum + (s.seats?.length || 0), 0);
    const soldSeats   = (event.sectors || []).reduce((sum, s) => sum + (s.seats?.filter(se => se.status === SEAT.SOLD).length || 0), 0);
    const lockedSeats = (event.sectors || []).reduce((sum, s) => sum + (s.seats?.filter(se => se.status === SEAT.LOCKED).length || 0), 0);
    const available   = totalSeats - soldSeats - lockedSeats;
    const minPrice = event.sectors?.length > 0 ? Math.min(...event.sectors.map(s => s.price || 0)) : 0;
    const pctOccupied = totalSeats > 0 ? Math.round(((soldSeats + lockedSeats) / totalSeats) * 100) : 0;
    const isToday     = new Date().toDateString() === date.toDateString();

    return `
      <article
        class="event-card"
        role="button"
        tabindex="0"
        aria-label="Ver butacas para ${event.name}"
        onclick="UI.renderView('event-detail', { eventId: '${event.id}' })"
        onkeydown="if(event.key==='Enter')UI.renderView('event-detail',{eventId:'${event.id}'})"
      >
        <div class="card-badge">${event.genre || 'En vivo'}</div>
        <div class="card-body">
          <div class="card-date" aria-label="${date.toLocaleDateString('es-AR')}">
            <span class="date-day">${date.getDate()}</span>
            <span class="date-month">${date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</span>
          </div>
          <div class="card-info">
            <h2 class="card-title">${this._escapeHtml(event.name)}</h2>
            <p class="card-venue">📍 ${this._escapeHtml(event.venue)}</p>
            <p class="card-time">🕐 ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs${isToday ? ' · <strong style="color:var(--accent)">Hoy</strong>' : ''}</p>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-availability">
            <div class="avail-bar"><div class="avail-fill" style="width:${pctOccupied}%"></div></div>
            <span class="avail-text">${available > 0 ? `${available} butacas disponibles` : '⚠ Agotadas'}</span>
          </div>
          <div class="card-price">Desde <strong>$${minPrice.toLocaleString('es-AR')}</strong></div>
          <button class="btn-card" tabindex="-1">Ver butacas →</button>
        </div>
      </article>
    `;
  },

  /* ----------------------------------------------------------
     VISTA: DETALLE DE EVENTO + MAPA DE ASIENTOS
     ---------------------------------------------------------- */
  async _buildEventDetail(eventId) {
    const event = await Events.getById(eventId);
    if (!event) return '<div class="error-state">Evento no encontrado.</div>';
    
    // Cargar sectores y asientos desde la API
    const sectors = await Events.getSectorsByEvent(eventId);
    const seatsAll = await Events.getSeatsByEvent(eventId);

    console.log('Sectores:', sectors);
    console.log('Asientos:', seatsAll);
    
    // Armar estructura compatible
    event.sectors = sectors.map(s => ({
        ...s,
       seats: seatsAll.filter(seat => String(seat.sectorId) === String(s.id)).map((seat, index) => ({
    ...seat,
    status: seat.status?.toLowerCase(),
    row: Math.floor(index / 10) + 1,
    col: (index % 10) + 1 
}))
}));

    // Asegurar sector válido
    this.currentSectorId = Number(this.currentSectorId) || Number(event.sectors[0]?.id) || null;

    const sector = event.sectors.find(s => s.id === this.currentSectorId);
    const date = new Date(event.eventDate || event.date);

    // Estadísticas por sector para barra de ocupación
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

          <!-- Barras de ocupación por sector -->
          <div class="sector-stats" aria-label="Disponibilidad por sector">
            ${sectorStats.map(s => `
              <div class="sector-stat-row">
                <span class="ss-label">${this._escapeHtml(s.name)}</span>
                <div class="ss-bar-wrap">
                  <div class="ss-bar-fill ${s.fill}" style="width:${s.pct}%" role="progressbar" aria-valuenow="${s.pct}" aria-valuemin="0" aria-valuemax="100"></div>
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
              const ss     = sectorStats.find(x => x.id === s.id);
              const soldOut= ss && ss.free === 0;
              return `
                <button
                  class="sector-tab ${s.id === this.currentSectorId ? 'active' : ''}"
                  role="tab"
                  aria-selected="${s.id === this.currentSectorId}"
                  onclick="UI.switchSector('${eventId}', '${s.id}')"
                >
                  ${this._escapeHtml(s.name)} — $${s.price.toLocaleString('es-AR')}
                  ${soldOut ? '<span class="new-badge" style="color:var(--seat-sold-light);border-color:var(--seat-sold);background:var(--seat-sold-bg)">Agotado</span>' : ''}
                </button>
              `;
            }).join('')}
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
              ${sector?.seats.filter(s => s.status === SEAT.AVAILABLE).length || 0} de ${sector?.seats.length || 0} disponibles
            </p>

            <!-- Botón de demo de concurrencia -->
            <div style="text-align:center;margin-top:20px;">
              <button class="btn-ghost" onclick="UI.demoConcurrencia('${eventId}', '${this.currentSectorId}')"
                title="Simula que otro usuario reserva una butaca disponible">
                🔬 Simular reserva de otro usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Construir la grilla de butacas para un sector.
   */
  _buildSeatGrid(event, sector) {
    if (!sector || !sector.seats || !sector.seats.length) {
      return '<p style="text-align:center;color:var(--text-3);padding:40px;">Este sector no tiene butacas configuradas.</p>';
    }

    const rows = Math.max(...sector.seats.map(s => s.row || s.seatNumber || 1));
    const cols = Math.max(...sector.seats.map(s => s.col || 1));
    const selectedIds = new Set(this.selectedSeats.map(s => s.seatId));
    const username    = Auth.currentUser?.username || '';

    let html = `<div class="seat-grid" style="grid-template-columns: repeat(${cols}, 34px)" role="list">`;

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const seat = sector.seats.find(s => (s.row === r && s.col === c) || s.seatNumber === ((r-1)*cols + c));
        if (!seat) {
          html += `<div class="seat placeholder" aria-hidden="true"></div>`;
          continue;
        }

        const isSelected  = selectedIds.has(seat.id);
        const isMine      = seat.lockedBy === username;
        let   cls         = 'seat';
        let   disabled    = false;
        let   ariaLabel   = `Fila ${r}, Butaca ${c}`;

        if (isSelected || (seat.status === SEAT.LOCKED && isMine)) {
          cls       += ' selected';
          ariaLabel += ' — en tu selección';
        } else if (seat.status === SEAT.AVAILABLE) {
          cls       += ' available';
          ariaLabel += ' — disponible';
        } else if (seat.status === SEAT.LOCKED) {
          cls       += ' locked';
          disabled   = true;
          ariaLabel += ' — reservado temporalmente';
        } else if (seat.status === SEAT.SOLD) {
          cls       += ' sold';
          disabled   = true;
          ariaLabel += ' — vendido';
        }

        html += `
          <button
            class="${cls}"
            ${disabled ? 'disabled aria-disabled="true"' : ''}
            role="listitem"
            aria-label="${ariaLabel}"
            title="${ariaLabel}"
            onclick="${disabled ? '' : `UI.handleSeatClick('${event.id}','${sector.id}','${seat.id}',${r},${c},${sector.price})`}"
            onmouseenter="UI.showSeatTooltip(event, ${JSON.stringify({ row: r, col: c, status: isSelected || (seat.status === SEAT.LOCKED && isMine) ? 'selected' : seat.status, price: sector.price, sectorName: sector.name })})"
            onmouseleave="UI.hideSeatTooltip()"
            onmousemove="UI.moveSeatTooltip(event)"
          ><span class="seat-label" aria-hidden="true">${c}</span></button>
        `;
      }
    }

    html += '</div>';
    return html;
  },

  /** Cambiar de sector activo sin recargar toda la vista. */
  switchSector(eventId, sectorId) {
    this.currentSectorId = Number(sectorId);
    this.renderView('event-detail', { eventId });
},

  /* ----------------------------------------------------------
     TOOLTIP DE BUTACA
     ---------------------------------------------------------- */
  showSeatTooltip(e, data) {
    const tooltip = document.getElementById('seat-tooltip');
    if (!tooltip) return;

    const statusLabels = {
      available: 'Disponible',
      locked:    'Reservado temporalmente',
      sold:      'Vendido',
      selected:  'En tu selección',
    };

    tooltip.innerHTML = `
      <div class="tt-row"><span>Sector</span><strong>${this._escapeHtml(data.sectorName)}</strong></div>
      <div class="tt-row"><span>Fila</span><strong>${data.row}</strong></div>
      <div class="tt-row"><span>Butaca</span><strong>${data.col}</strong></div>
      <div class="tt-row"><span>Estado</span><span class="tt-status ${data.status}">${statusLabels[data.status] || data.status}</span></div>
      <div class="tt-row"><span>Precio</span><strong>$${data.price.toLocaleString('es-AR')}</strong></div>
    `;
    tooltip.classList.remove('hidden');
    this.moveSeatTooltip(e);
  },

  moveSeatTooltip(e) {
    const tooltip = document.getElementById('seat-tooltip');
    if (!tooltip || tooltip.classList.contains('hidden')) return;
    const x = e.clientX + 12;
    const y = e.clientY - 8;
    const rect = tooltip.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    tooltip.style.left = `${Math.min(x, vw - rect.width - 8)}px`;
    tooltip.style.top  = `${Math.min(y, vh - rect.height - 8)}px`;
  },

  hideSeatTooltip() {
    document.getElementById('seat-tooltip')?.classList.add('hidden');
  },

  /**
   * Manejar clic en una butaca.
   * Si ya está en la selección → liberar.
   * Si está libre → intentar bloquear.
   */
  async handleSeatClick(eventId, sectorId, seatId, row, col, price) {
    const username = Auth.currentUser?.username;
    if (!username) return;

    // ¿Ya está en el carrito del usuario? → deseleccionar
    const existingIdx = this.selectedSeats.findIndex(s => s.seatId === seatId);
    if (existingIdx >= 0) {
      const sel = this.selectedSeats[existingIdx];
      Seats.unlock(sel.eventId, sel.sectorId, seatId, username);
      this.selectedSeats.splice(existingIdx, 1);
      this._refreshSeatMap();
      this._updateSelectionPanel();
      return;
    }

    // Intentar bloquear en el "backend" (localStorage)
    const result = Reservations.create(eventId, sectorId, seatId, username);

    if (result.success) {
      const event  = Events.getById(eventId);
      const sector = event?.sectors.find(s => s.id === sectorId);
      this.selectedSeats.push({
        eventId,
        sectorId,
        seatId,
        seatLabel:   `Fila ${row} · Butaca ${col}`,
        sectorName:  sector?.name   || '',
        eventName:   event?.name    || '',
        price:       price,
        lockExpiry:  result.lockExpiry,
      });
      this.showToast(`Butaca seleccionada: Fila ${row}, Butaca ${col}`, 'success');
    } else {
      // Feedback de error de concurrencia u otro problema
      this.showToast(result.error, 'error');
    }

    this._refreshSeatMap();
    this._updateSelectionPanel();
  },

  /**
   * Demo de concurrencia: simula que "otroUsuario" reserva una butaca disponible.
   * Muestra el mensaje de error que vería el usuario actual al intentar tomar esa butaca.
   */
  demoConcurrencia(eventId, sectorId) {
    const event  = Events.getById(eventId);
    const sector = event?.sectors?.find(s => s.id === sectorId);
    if (!sector || !sector.seats) return;

    // Buscar una butaca disponible que NO esté en la selección actual
    const selectedIds = new Set(this.selectedSeats.map(s => s.seatId));
    const available   = sector.seats.find(
      s => s.status === SEAT.AVAILABLE && !selectedIds.has(s.id)
    );
    if (!available) {
      this.showToast('No hay butacas disponibles para la demo en este sector.', 'warning');
      return;
    }

    // Bloquear como "otroUsuario" simulado
    Events.updateSeat(eventId, sectorId, available.id, {
      status:     SEAT.LOCKED,
      lockedBy:   'otroUsuario_demo',
      lockExpiry: Date.now() + 30000, // 30 segundos para el demo
      soldTo:     null,
    });
    Audit.log('otroUsuario_demo', ACTION.RESERVE_SUCCESS, { eventId, sectorId, seatId: available.id });

    this._refreshSeatMap();
    this.showToast(
      `🔬 Demo: "otroUsuario" reservó Fila ${available.row} · Butaca ${available.col}. ¡Intentá hacer clic en esa butaca!`,
      'warning',
      6000
    );
  },

  /** Actualizar solo el mapa de butacas sin re-renderizar toda la vista. */
  async _refreshSeatMap() {
    if (this.currentView !== 'event-detail' || !this.currentEventId) return;

    const event  = Events.getById(this.currentEventId);
    const sector = event?.sectors.find(s => s.id === this.currentSectorId);
    if (!event || !sector || !sector.seats) return;

    const mapEl = document.getElementById('seat-map');
    if (mapEl) mapEl.innerHTML = this._buildSeatGrid(event, sector);

    const infoEl = document.getElementById('sector-info');
    if (infoEl) {
      const avail = (sector.seats?.filter(s => s.status === SEAT.AVAILABLE).length || 0);
      infoEl.innerHTML = `Sector: <strong>${this._escapeHtml(sector.name)}</strong> &middot; ${avail} de ${sector.seats.length} disponibles`;
    }
  },

  /* ----------------------------------------------------------
     PANEL DE SELECCIÓN (carrito flotante)
     ---------------------------------------------------------- */
  _updateSelectionPanel() {
    const panel     = document.getElementById('selection-panel');
    const listEl    = document.getElementById('selection-list');
    const totalEl   = document.getElementById('selection-total-amount');
    const countEl   = document.getElementById('selection-count');
    if (!panel) return;

    if (this.selectedSeats.length === 0) {
      panel.classList.add('hidden');
      this._stopCountdown();
      return;
    }

    panel.classList.remove('hidden');

    // Renderizar lista de butacas
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

    // Total
    const total = this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-AR')}`;
    if (countEl) countEl.textContent = `${this.selectedSeats.length} butaca${this.selectedSeats.length !== 1 ? 's' : ''}`;

    this._startCountdown();
  },

  /** Quitar una butaca del carrito y liberar su bloqueo. */
  async removeSeat(seatId) {
    const idx = this.selectedSeats.findIndex(s => s.seatId === seatId);
    if (idx < 0) return;
    const sel = this.selectedSeats[idx];
    Seats.unlock(sel.eventId, sel.sectorId, seatId, Auth.currentUser?.username || '');
    this.selectedSeats.splice(idx, 1);
    this._refreshSeatMap();
    this._updateSelectionPanel();
  },

  /** Cancelar toda la selección. */
  clearSelection() {
    this.selectedSeats.forEach(sel => {
      Seats.unlock(sel.eventId, sel.sectorId, sel.seatId, Auth.currentUser?.username || '');
    });
    this.selectedSeats = [];
    this._refreshSeatMap();
    this._updateSelectionPanel();
    this.showToast('Selección cancelada.', 'info');
  },

  /** Iniciar temporizador regresivo del carrito. */
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

      // Limpiar butacas expiradas del carrito
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

  /** Confirmar la compra de todas las butacas seleccionadas. */
  async _handlePurchase() {
    if (!this.selectedSeats.length) return;

    const result = Seats.purchase(this.selectedSeats, Auth.currentUser?.username || '');

    if (result.success) {
      const count       = this.selectedSeats.length;
      this.selectedSeats = [];
      this._stopCountdown();
      this._updateSelectionPanel();
      this._refreshSeatMap();
      this._showPurchaseModal(count);
    } else {
      this.showToast(result.error, 'error');
      // Limpiar butacas inválidas
      const now = Date.now();
      this.selectedSeats = this.selectedSeats.filter(s => s.lockExpiry > now);
      this._updateSelectionPanel();
      this._refreshSeatMap();
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
    // Auto-cerrar a los 10 segundos
    setTimeout(() => { if (root) root.innerHTML = ''; }, 10000);
  },

  /* ----------------------------------------------------------
     VISTA: MIS ENTRADAS
     ---------------------------------------------------------- */
  async _buildMyTickets() {
  const username = Auth.currentUser?.username || '';
  const events   = await Events.getAll();
  const tickets  = [];

  events.forEach(event => {
    if (!event.sectors || !Array.isArray(event.sectors)) return;
    event.sectors.forEach(sector => {
      if (!sector.seats || !Array.isArray(sector.seats)) return;
      sector.seats
        .filter(s => s.soldTo === username)
        .forEach(seat => tickets.push({ event, sector, seat }));
    });
  });

    if (!tickets.length) {
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

    // Agrupar por evento
    const grouped = tickets.reduce((acc, t) => {
      const key = t.event.id;
      if (!acc[key]) acc[key] = { event: t.event, items: [] };
      acc[key].items.push(t);
      return acc;
    }, {});

    const total = tickets.reduce((s, t) => s + t.sector.price, 0);

    return `
      <div class="page-header">
        <h1 class="page-title">Mis <span class="accent">Entradas</span></h1>
        <p class="page-subtitle">${tickets.length} entrada${tickets.length !== 1 ? 's' : ''} · Total gastado: <strong style="color:var(--accent)">$${total.toLocaleString('es-AR')}</strong></p>
        <div class="header-actions">
          <button class="btn-secondary" onclick="UI.showPrintView()">🖨️ Imprimir entradas</button>
        </div>
      </div>
      <div class="tickets-list">
        ${Object.values(grouped).map(g => this._buildTicketGroup(g)).join('')}
      </div>
    `;
  },

  _buildTicketGroup({ event, items }) {
    const date = new Date(event.eventDate || event.date);
    return `
      <div class="ticket-group">
        <h3 class="ticket-event-name">${this._escapeHtml(event.name)}</h3>
        <p class="ticket-event-meta">
          📅 ${date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          &nbsp;·&nbsp; 📍 ${this._escapeHtml(event.venue)}
        </p>
        <div class="tickets-row">
          ${items.map(t => this._buildTicketCard(t)).join('')}
        </div>
      </div>
    `;
  },

  _buildTicketCard({ event, sector, seat }) {
    const date = new Date(event.eventDate || event.date);
    return `
      <div class="ticket-card" role="article" aria-label="Entrada para ${event.name}">
        <div class="ticket-perforation" aria-hidden="true"></div>
        <div class="ticket-main">
          <div class="ticket-title">${this._escapeHtml(event.name)}</div>
          <div class="ticket-detail">
            <span>Sector: <strong>${this._escapeHtml(sector.name)}</strong></span>
            <span>Fila: <strong>${seat.row}</strong></span>
            <span>Butaca: <strong>${seat.col}</strong></span>
          </div>
          <div class="ticket-venue">📍 ${this._escapeHtml(event.venue)}</div>
        </div>
        <div class="ticket-stub" aria-label="Fecha y precio">
          <div class="stub-date">
            <span class="stub-day">${date.getDate()}</span>
            <span class="stub-month">${date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</span>
          </div>
          <div class="stub-time">${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</div>
          <div class="stub-price">$${sector.price.toLocaleString('es-AR')}</div>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     VISTA DE IMPRESIÓN
     ---------------------------------------------------------- */
  async showPrintView() {
  const username = Auth.currentUser?.username || '';
  const events   = await Events.getAll();
  const tickets  = [];

  events.forEach(event => {
    event.sectors.forEach(sector => {
      sector.seats
        .filter(s => s.soldTo === username)
        .forEach(seat => tickets.push({ event, sector, seat }));
    });
  });

    if (!tickets.length) { this.showToast('No tenés entradas para imprimir.', 'info'); return; }

    const overlay = document.createElement('div');
    overlay.className = 'print-view-overlay';
    overlay.id        = 'print-overlay';

    overlay.innerHTML = `
      <div class="print-view-card">
        <div class="print-header">
          <div class="print-title">🎟️ Mis Entradas</div>
          <div class="print-actions">
            <button class="btn-primary" onclick="window.print()">Imprimir</button>
            <button class="btn-secondary" onclick="document.getElementById('print-overlay').remove()">Cerrar</button>
          </div>
        </div>
        ${tickets.map(t => {
          const date = new Date(event.eventDate || event.date);
          const id   = `TV-${t.seat.id.toUpperCase().slice(-8)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
          return `
            <div class="print-ticket">
              <div class="print-ticket-main">
                <div class="pt-event">${this._escapeHtml(t.event.name)}</div>
                <div class="pt-grid">
                  <div class="pt-item"><strong>${date.toLocaleDateString('es-AR')}</strong>Fecha</div>
                  <div class="pt-item"><strong>${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong>Horario</div>
                  <div class="pt-item"><strong>${this._escapeHtml(t.sector.name)}</strong>Sector</div>
                  <div class="pt-item"><strong>Fila ${t.seat.row} · Butaca ${t.seat.col}</strong>Asiento</div>
                  <div class="pt-item"><strong>${this._escapeHtml(t.event.venue)}</strong>Lugar</div>
                  <div class="pt-item"><strong>$${t.sector.price.toLocaleString('es-AR')}</strong>Precio</div>
                </div>
                <div class="pt-id">ID: ${id} · Titular: ${this._escapeHtml(username)}</div>
              </div>
              <div class="print-ticket-stub">
                <div class="stub-date">
                  <span class="stub-day">${date.getDate()}</span>
                  <span class="stub-month">${date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div class="stub-time">${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</div>
                <div class="stub-price">$${t.sector.price.toLocaleString('es-AR')}</div>
              </div>
            </div>
          `;
        }).join('')}
        <div class="print-footer">
          TicketVivo · Entradas generadas el ${new Date().toLocaleString('es-AR')} · Esta entrada es válida con documento de identidad
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Cerrar al clickear el fondo
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  /* ----------------------------------------------------------
     VISTA: ADMIN — Panel de gestión con dashboard
     ---------------------------------------------------------- */
 async _buildAdmin(){
  const events = await Events.getAll();
  const logs   = Audit.getLogs();

    // ── Calcular estadísticas globales ──
    let totalSeats  = 0, soldSeats = 0, lockedSeats = 0, totalRevenue = 0;
    events.forEach(event => {
      if (!event.sectors || !Array.isArray(event.sectors)) return;
      event.sectors.forEach(sector => {
        if (!sector.seats || !Array.isArray(sector.seats)) return;
        sector.seats.forEach(seat => {
          totalSeats++;
          if (seat.status === SEAT.SOLD)   { soldSeats++;   totalRevenue += sector.price; }
          if (seat.status === SEAT.LOCKED) { lockedSeats++; }
        });
      });
    });
    const availableSeats = totalSeats - soldSeats - lockedSeats;
    const occupancyPct   = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;

    return `
      <div class="page-header">
        <h1 class="page-title">Panel de <span class="accent">Administración</span></h1>
        <div class="header-actions">
          <button class="btn-primary" onclick="UI.renderView('admin-form', {})">+ Nuevo evento</button>
          <button class="btn-secondary" onclick="UI.renderView('admin-audit')">Ver auditoría</button>
        </div>
      </div>

      <!-- Dashboard de estadísticas -->
      <div class="dashboard-stats" aria-label="Estadísticas generales">
        <div class="dash-card accent-gold">
          <span class="dash-icon">📅</span>
          <span class="dash-value">${events.length}</span>
          <span class="dash-label">Eventos activos</span>
        </div>
        <div class="dash-card accent-green">
          <span class="dash-icon">🎟️</span>
          <span class="dash-value">${soldSeats.toLocaleString('es-AR')}</span>
          <span class="dash-label">Entradas vendidas</span>
          <span class="dash-sub">${occupancyPct}% de ocupación</span>
        </div>
        <div class="dash-card accent-yellow">
          <span class="dash-icon">⏳</span>
          <span class="dash-value">${lockedSeats}</span>
          <span class="dash-label">Reservadas ahora</span>
          <span class="dash-sub">Expiran en 5 min</span>
        </div>
        <div class="dash-card accent-red">
          <span class="dash-icon">💺</span>
          <span class="dash-value">${availableSeats.toLocaleString('es-AR')}</span>
          <span class="dash-label">Disponibles</span>
          <span class="dash-sub">de ${totalSeats.toLocaleString('es-AR')} totales</span>
        </div>
        <div class="dash-card accent-blue">
          <span class="dash-icon">💰</span>
          <span class="dash-value" style="font-size:1.5rem">$${totalRevenue.toLocaleString('es-AR')}</span>
          <span class="dash-label">Recaudación total</span>
          <span class="dash-sub">${logs.filter(l => l.action === ACTION.PURCHASE).length} transacciones</span>
        </div>
      </div>

      <div class="admin-section-tabs">
        <button class="admin-tab-btn active">Eventos (${events.length})</button>
      </div>

      <div class="admin-events">
        ${!events.length
          ? '<div class="empty-state"><div class="empty-icon">📅</div><p>No hay eventos creados.</p></div>'
          : events.map(e => this._buildAdminEventRow(e)).join('')
        }
      </div>
    `;
  },

  _buildAdminEventRow(event) {
    // Verificar que el evento tenga sectores válidos
    if (!event.sectors || !Array.isArray(event.sectors) || event.sectors.length === 0) {
      return '';
    }

    const date = new Date(event.eventDate || event.date);
    const totalSeats  = event.sectors.reduce((sum, s) => sum + (s.seats?.length || 0), 0);
    const soldSeats   = event.sectors.reduce((sum, s) => sum + (s.seats?.filter(se => se.status === SEAT.SOLD).length || 0), 0);
    const lockedSeats = event.sectors.reduce((sum, s) => sum + (s.seats?.filter(se => se.status === SEAT.LOCKED).length || 0), 0);
    const available   = totalSeats - soldSeats - lockedSeats;
    const revenue     = event.sectors.reduce((sum, s) => {
      const sold = (s.seats?.filter(se => se.status === SEAT.SOLD).length || 0);
      return sum + sold * (s.price || 0);
    }, 0);

    return `
      <div class="admin-event-row">
        <div class="admin-event-info">
          <h3>${this._escapeHtml(event.name)}</h3>
          <p>
            ${date.toLocaleDateString('es-AR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            &nbsp;·&nbsp; ${this._escapeHtml(event.venue)}
          </p>
          <div class="admin-stats">
            <span class="stat available">✓ ${available} disponibles</span>
            <span class="stat locked">⏳ ${lockedSeats} bloqueadas</span>
            <span class="stat sold">✗ ${soldSeats} vendidas</span>
            ${revenue > 0 ? `<span class="stat" style="background:var(--accent-dim);color:var(--accent)">💰 $${revenue.toLocaleString('es-AR')}</span>` : ''}
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn-sm" onclick="UI.renderView('event-detail', { eventId: '${event.id}' })">Ver mapa</button>
          <button class="btn-sm" onclick="UI.renderView('admin-form', { eventId: '${event.id}' })">Editar</button>
          <button class="btn-sm" onclick="UI._confirmResetSeats('${event.id}')" title="Liberar todas las butacas bloqueadas">Reset</button>
          <button class="btn-sm danger" onclick="UI._confirmDeleteEvent('${event.id}')">Eliminar</button>
        </div>
      </div>
    `;
  },

  /** Liberar todos los bloqueos temporales de un evento (útil para limpieza). */
  async _confirmResetSeats(eventId) {
    const event = Events.getById(eventId);
    if (!event || !event.sectors) return;
    const locked = event.sectors.reduce((s, sec) => s + (sec.seats?.filter(se => se.status === SEAT.LOCKED).length || 0), 0);
    if (locked === 0) { this.showToast('No hay butacas bloqueadas en este evento.', 'info'); return; }
    if (!confirm(`Liberar ${locked} butaca(s) bloqueadas temporalmente en "${event.name}"?`)) return;
    event.sectors.forEach(sector => {
      if (!sector.seats) return;
      sector.seats.forEach(seat => {
        if (seat.status === SEAT.LOCKED) {
          Events.updateSeat(event.id, sector.id, seat.id, { status: SEAT.AVAILABLE, lockedBy: null, lockExpiry: null });
          Audit.log('admin', ACTION.RELEASE, { eventId: event.id, sectorId: sector.id, seatId: seat.id, reason: 'admin_reset' });
        }
      });
    });
    this.showToast(`${locked} butaca(s) liberadas.`, 'success');
    this.renderView('admin');
  },

  async _confirmDeleteEvent(eventId) {
    const event = Events.getById(eventId);
    if (!event) return;
    if (!confirm(`¿Eliminar "${event.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    Events.delete(eventId);
    this.renderView('admin');
    this.showToast(`Evento "${event.name}" eliminado.`, 'info');
  },

  /* ----------------------------------------------------------
     VISTA: FORMULARIO DE EVENTO (Admin)
     ---------------------------------------------------------- */
  _buildEventForm(eventId) {
    const event   = eventId ? Events.getById(eventId) : null;
    const isEdit  = !!event;
    const sectors = event?.sectors || [{ id: '', name: 'Campo', rows: 5, cols: 10, price: 5000 }];

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
            <div class="form-group">
              <label for="f-genre">Género / estilo</label>
              <input type="text" id="f-genre" value="${this._escapeHtml(event?.genre || '')}" placeholder="Ej: Rock, Cumbia..." />
            </div>
          </div>

          <div class="form-row" style="margin-top:16px">
            <div class="form-group">
              <label for="f-date">Fecha y hora *</label>
              <input type="datetime-local" id="f-date" value="${event?.date || ''}" />
            </div>
            <div class="form-group">
              <label for="f-venue">Lugar *</label>
              <input type="text" id="f-venue" value="${this._escapeHtml(event?.venue || '')}" placeholder="Teatro, estadio, etc." />
            </div>
          </div>

          <div class="form-group" style="margin-top:16px">
            <label for="f-desc">Descripción</label>
            <textarea id="f-desc" placeholder="Contá de qué se trata el evento...">${this._escapeHtml(event?.description || '')}</textarea>
          </div>

          <!-- Sectores dinámicos -->
          <div class="sectors-section">
            <div class="sectors-header">
              <h3>Sectores y butacas</h3>
              <button class="btn-sm" type="button" onclick="UI._addSectorRow()">+ Agregar sector</button>
            </div>
            <div id="sectors-list">
              ${sectors.map((s, i) => this._buildSectorRow(s, i)).join('')}
            </div>
            <p style="font-size:0.75rem;color:var(--text-3);margin-top:8px">
              💡 Las butacas se generan automáticamente al guardar. Máx. 20×20 por sector.
            </p>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" type="button" onclick="UI.renderView('admin')">Cancelar</button>
            <button class="btn-primary" type="button" id="btn-save-event">
              ${isEdit ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>

        </div>
      </div>
    `;
  },

  _buildSectorRow(sector, idx) {
    return `
      <div class="sector-row" data-idx="${idx}" data-sector-id="${sector.id || ''}">
        <div class="sector-field">
          <label>Nombre del sector</label>
          <input type="text" class="s-name" value="${this._escapeHtml(sector.name || '')}" placeholder="Campo, Platea, VIP..." />
        </div>
        <div class="sector-field narrow">
          <label>Filas</label>
          <input type="number" class="s-rows" value="${parseInt(sector.rows) || 5}" min="1" max="20" />
        </div>
        <div class="sector-field narrow">
          <label>Cols</label>
          <input type="number" class="s-cols" value="${parseInt(sector.cols) || 10}" min="1" max="20" />
        </div>
        <div class="sector-field">
          <label>Precio $</label>
          <input type="number" class="s-price" value="${parseInt(sector.price) || 5000}" min="0" step="100" />
        </div>
        <button type="button" class="btn-icon-danger" onclick="this.closest('.sector-row').remove()" title="Quitar sector">✕</button>
      </div>
    `;
  },

  _addSectorRow() {
    const container = document.getElementById('sectors-list');
    if (!container) return;
    const idx = container.children.length;
    const div = document.createElement('div');
    div.innerHTML = this._buildSectorRow({ id: '', name: '', rows: 5, cols: 10, price: 5000 }, idx);
    container.appendChild(div.firstElementChild);
  },

  _attachFormListeners(eventId) {
    const saveBtn = document.getElementById('btn-save-event');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._saveEvent(eventId));
    }
  },

  async _saveEvent(eventId) {
    const name  = document.getElementById('f-name')?.value.trim() || '';
    const date  = document.getElementById('f-date')?.value || '';
    const venue = document.getElementById('f-venue')?.value.trim() || '';
    const genre = document.getElementById('f-genre')?.value.trim() || '';
    const desc  = document.getElementById('f-desc')?.value.trim() || '';

    if (!name || !date || !venue) {
      this.showToast('Completá los campos obligatorios: nombre, fecha y lugar.', 'error');
      return;
    }

    const sectorRows = document.querySelectorAll('#sectors-list .sector-row');
    if (!sectorRows.length) {
      this.showToast('Agregá al menos un sector al evento.', 'error');
      return;
    }

    const sectors = [];
    let valid = true;
    sectorRows.forEach(row => {
      const sName  = row.querySelector('.s-name')?.value.trim() || '';
      const sRows  = Math.min(20, Math.max(1, parseInt(row.querySelector('.s-rows')?.value) || 5));
      const sCols  = Math.min(20, Math.max(1, parseInt(row.querySelector('.s-cols')?.value) || 10));
      const sPrice = Math.max(0, parseInt(row.querySelector('.s-price')?.value) || 0);
      const sId    = row.dataset.sectorId || '';
      if (!sName) { valid = false; return; }
      sectors.push({ id: sId, name: sName, rows: sRows, cols: sCols, price: sPrice });
    });

    if (!valid) {
      this.showToast('Cada sector debe tener un nombre.', 'error');
      return;
    }

    const data = { name, date, venue, genre, description: desc, sectors };

    if (eventId) {
      Events.update(eventId, data);
      this.showToast('Evento actualizado correctamente.', 'success');
    } else {
      const created = Events.create(data);
      this.showToast(`Evento "${created.name}" creado con ${sectors.reduce((s, sec) => s + sec.rows * sec.cols, 0)} butacas.`, 'success');
    }

    this.renderView('admin');
  },

  /* ----------------------------------------------------------
     VISTA: AUDITORÍA (Admin)
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

    // Usuarios únicos para filtro
    const users = [...new Set(allLogs.map(l => l.user))].sort();

    return `
      <div class="page-header">
        <button class="btn-back" onclick="UI.renderView('admin')">← Volver al panel</button>
        <h1 class="page-title">Registro de <span class="accent">Auditoría</span></h1>
        <p class="page-subtitle">${allLogs.length} entradas registradas · Solo lectura · Inmutable</p>
      </div>

      <!-- Filtros de auditoría -->
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

  /** Filtrar filas de auditoría en tiempo real. */
  filterAuditLogs() {
    const query       = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const actionFlt   = document.getElementById('audit-action-filter')?.value || '';
    const userFlt     = document.getElementById('audit-user-filter')?.value    || '';
    const tbody       = document.getElementById('audit-tbody');
    const countEl     = document.getElementById('audit-count');

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
     TOASTS (notificaciones)
     ---------------------------------------------------------- */
  /**
   * Mostrar una notificación tipo toast.
   * @param {string} message  - Mensaje a mostrar
   * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Duración en ms (default 3500)
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast    = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span>${this._escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" aria-label="Cerrar notificación">✕</button>
    `;
    container.appendChild(toast);

    // Auto-eliminar con animación
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  /* ----------------------------------------------------------
     UTILIDADES
     ---------------------------------------------------------- */
  /** Escapar HTML para evitar XSS. */
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
   PROCESO EN SEGUNDO PLANO — Liberación automática de butacas
   Simula un worker/cron job que revisa reservas expiradas.
   Se mantiene en ui.js porque interactúa directamente con UI
   para refrescar el mapa y el carrito del usuario activo.
   ============================================================ */
const Background = {
  start() {
    // Revisar cada 15 segundos si hay butacas expiradas
    setInterval(() => {
      const released = Seats.releaseExpired();

      if (released > 0) {
        console.log(`[Background] ${released} butaca(s) liberada(s) por timeout.`);
        // Actualizar mapa si el usuario lo está viendo
        UI._refreshSeatMap();

        // Limpiar butacas expiradas del carrito del usuario actual
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
