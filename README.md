# PS
# TicketAPPI — Sistema de Venta de Entradas

Sistema de venta de entradas para eventos con reserva de asientos en tiempo real.

## Tecnologías

- **Backend:** C#, ASP.NET Core, Entity Framework Core 8
- **Base de datos:** SQL Server
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Documentación API:** Swagger / OpenAPI

## Requisitos previos

- .NET 8 SDK
- SQL Server
- Visual Studio 2022

## Cómo ejecutar el proyecto

### Backend

1. Clonar el repositorio
2. Abrir `Backend/PS.sln` en Visual Studio
3. Configurar `appsettings.json` con tu cadena de conexión:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=EventDB;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

4. Ejecutar las migraciones:
```bash
cd Backend
dotnet ef database update --project Infrastructure --startup-project EventApi
```

5. Ejecutar el proyecto con F5 en Visual Studio
6. El Swagger estará disponible en: `https://localhost:7198/swagger`

### Frontend

1. Abrir la carpeta `Frontend`
2. Abrir `index.html` con Live Server (Visual Studio Code)

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |

## Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v1/Events | Listar todos los eventos |
| GET | /api/v1/Events/{id} | Obtener evento por ID |
| POST | /api/v1/Events | Crear evento |
| GET | /api/v1/Sectors/event/{id} | Sectores de un evento |
| GET | /api/v1/Seats/event/{id} | Asientos de un evento |
| POST | /api/v1/Reservations | Crear reserva |
| GET | /api/v1/Reservations/user/{id} | Reservas de un usuario |

## Datos de prueba

Al iniciar el proyecto se carga automáticamente:
- 1 Evento: Aerosmith
- 2 Sectores: Platea Alta y Platea Baja
- 50 butacas por sector
