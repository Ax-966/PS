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
<<<<<<< HEAD
conStrBuilder.Password = builder.Configuration["DbPassword"] ?? "";
=======

conStrBuilder.Password =
    builder.Configuration["DbPassword"] ?? "";

>>>>>>> 380adc44888ba1bff8ef09b7ea64033412e0ff8b
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(conStrBuilder.ConnectionString)
);

// ─── CORS ─────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ─── Servicios ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// ─── CORS ─────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


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

<<<<<<< HEAD
var app = builder.Build();

=======

var app = builder.Build();


>>>>>>> 380adc44888ba1bff8ef09b7ea64033412e0ff8b
// ─── Pipeline HTTP ────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

<<<<<<< HEAD
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// ─── Seed de datos ────────────────────────────────────────────────
=======
app.UseHttpsRedirection();

app.UseCors("frontend");

app.UseAuthorization();

app.MapControllers();


// ─── Seed ─────────────────────────────────────────────────────────
>>>>>>> 380adc44888ba1bff8ef09b7ea64033412e0ff8b
using (var scope = app.Services.CreateScope())
{
    var context =
        scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await DbSeeder.SeedAsync(context);
}

app.Run();