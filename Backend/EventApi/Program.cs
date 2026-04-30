using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;
using Application.Interfaces;
using Application.UseCases.Events.Handlers;
using Application.UseCases.Sectors.Handlers;
using Application.UseCases.Seats.Handlers;
using Application.UseCases.Reservations.Handlers;
using Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// ─── Configuración de la BD ───────────────────────────────────────
var conStrBuilder = new SqlConnectionStringBuilder(
    builder.Configuration.GetConnectionString("DefaultConnection")
);
conStrBuilder.Password = builder.Configuration["DbPassword"] ?? "";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(conStrBuilder.ConnectionString));


// ─── Servicios ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── Repositorios ─────────────────────────────────────────────────
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<ISeatRepository, SeatRepository>();
builder.Services.AddScoped<ISectorRepository, SectorRepository>();
builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLRepository>();

// ─── Handlers ─────────────────────────────────────────────────────
builder.Services.AddScoped<CreateEventHandler>();
builder.Services.AddScoped<GetAllEventsHandler>();
builder.Services.AddScoped<GetEventByIdHandler>();
builder.Services.AddScoped<GetSeatsByEventHandler>();
builder.Services.AddScoped<GetSectorsByEventHandler>();
builder.Services.AddScoped<CreateReservationHandler>();
builder.Services.AddScoped<GetReservationByUserHandler>();

var app = builder.Build();

// ─── Pipeline HTTP ────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();