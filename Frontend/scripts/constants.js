/**
 * TicketVivo — constants.js
 * Constantes de negocio globales compartidas por todos los módulos.
 * Al estar declaradas con const en el scope global del navegador,
 * todos los scripts cargados después pueden acceder a ellas.
 */

'use strict';

/* ============================================================
   CONSTANTES DE NEGOCIO
   ============================================================ */
const API_BASE_URL = 'https://localhost:7198/api/v1';

const LOCK_DURATION_MS     = 5 * 60 * 1000;  // 5 minutos de bloqueo
const RELEASE_CHECK_MS     = 15 * 1000;       // revisar expirados cada 15s
const ADMIN_CREDENTIALS    = {
  username: 'admin',
  password: 'admin123',
  role:     'admin',
  email:    'admin@ticketvivo.com',
  id:       'admin',
};

/** Tipos de acción para auditoría (inmutables) */
const ACTION = Object.freeze({
  RESERVE_SUCCESS: 'RESERVE_SUCCESS',  // reserva exitosa
  RESERVE_FAIL:    'RESERVE_FAIL',     // conflicto de concurrencia o seat no disponible
  PURCHASE:        'PURCHASE',         // compra confirmada
  RELEASE:         'RELEASE',          // liberación automática por timeout
  UNLOCK:          'UNLOCK',           // cancelación manual por el usuario
});

/** Estados posibles de una butaca */
const SEAT = Object.freeze({
  AVAILABLE: 'available',
  LOCKED:    'locked',
  SOLD:      'sold',
});
