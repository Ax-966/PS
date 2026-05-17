PS
TicketAPPI — Sistema de Venta de Entradas

Sistema de venta de entradas para eventos con reserva de asientos en tiempo real, control de concurrencia, pagos transaccionales y liberación automática de butacas.

Tecnologías

Backend: C#, ASP.NET Core, Entity Framework Core 8
Base de datos: SQL Server
Frontend: HTML, CSS, JavaScript (Vanilla)
Documentación API: Swagger / OpenAPI

Requisitos previos

- .NET 8 SDK
- SQL Server
- Visual Studio 2022

Cómo ejecutar el proyecto

Backend

1. Clonar el repositorio
2. Abrir "Backend/PS.sln" en Visual Studio
3. Configurar "appsettings.json" con tu cadena de conexión:

>>>json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=EventDB;Trusted_Connection=True;TrustServerCertificate=True;"
}


4. Ejecutar las migraciones:
cd Backend
dotnet ef database update --project Infrastructure --startup-project EventApi


5. Ejecutar el proyecto con F5 en Visual Studio
6. El Swagger estará disponible en: `https://localhost:7198/swagger`

Frontend

1. Abrir la carpeta `Frontend`
2. Abrir `index.html` con Live Server (Visual Studio Code)

Credenciales de prueba

| Usuario | Contraseña | Rol           |
|---------|----------- |---------------|
| admin   | admin123   | Administrador |

Funcionalidades implementadas

Entrega 1
>Catálogo de eventos con visualización del mapa de asientos
>Diferenciación visual entre butacas disponibles y ocupadas
>Reserva básica de butacas con registro de auditoría

Entrega 2
>Temporizador de reserva: al seleccionar una butaca, el usuario dispone de 5 minutos para completar la compra. La cuenta regresiva es visible en pantalla en todo momento.
>Control de concurrencia: implementado mediante Optimistic Locking. Si dos usuarios intentan reservar la misma butaca simultáneamente, solo uno tiene éxito. El segundo recibe un error 409 Conflict y el mapa se actualiza automáticamente.
>Liberación automática: un proceso en segundo plano detecta reservas vencidas (más de 5 minutos sin pago) y devuelve las butacas al estado disponible.
>Simulación de pago: el usuario con reserva activa puede confirmar la compra y recibe un ticket como comprobante. La operación es atómica: si cualquier parte falla, se ejecuta un rollback completo.
>Auditoría: cada acción relevante (intento de reserva, pago, liberación automática) queda registrada con el usuario, la acción, el recurso afectado y el timestamp exacto.

Endpoints principales

| Método | Endpoint                         | Descripción                                |
|--------|----------------------------------|--------------------------------------------|
| GET    | /api/v1/Events                   | Listar todos los eventos                   |
| GET    | /api/v1/Events/{id}              | Obtener evento por ID                      |
| POST   | /api/v1/Events                   | Crear evento                               |
| GET    | /api/v1/Sectors/event/{id}       | Sectores de un evento                      |
| GET    | /api/v1/Seats/event/{id}         | Asientos de un evento                      |
| POST   | /api/v1/Reservations             | Crear reserva (con control de concurrencia)|
| POST   |/api/v1/Reservations/{id}/confirm |Confirmar compra (transaccional)            |
| GET    | /api/v1/Reservations/user/{id}   | Reservas de un usuario                     |
|GET     |/api/v1/AuditLogs                 |Ver registros de auditoría                  |

Manejo de errores
|Código                    |Situación                                                           |
|--------------------------|--------------------------------------------------------------------|
|200 OK                    |Operación exitosa                                                   |
|400 Bad Request           |Datos inválidos en la solicitud                                     |
|404 Not Found             |Recurso no encontrado                                               |
|409 Conflict              |Conflicto de concurrencia al intentar reservar una butaca ya tomada |
|500 Internal Server Error |Error inesperado del servidor                                       |

Datos de prueba
Al iniciar el proyecto se carga automáticamente:
- 1 Evento: Aerosmith
- 2 Sectores: Platea Alta y Platea Baja
- 50 butacas por sector
