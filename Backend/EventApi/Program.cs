using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;
using Application.Interfaces;
using Application.UseCases.Events.Handlers;
using Application.UseCases.Sectors.Handlers;
using Application.UseCases.Seats.Handlers;
using Application.UseCases.Reservations.Handlers;
using Infrastructure.Repositories;
using Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ─── BD ───────────────────────────────────────────────────────────
var conStrBuilder = new SqlConnectionStringBuilder(
    builder.Configuration.GetConnectionString("DefaultConnection")
);
conStrBuilder.Password = builder.Configuration["DbPassword"] ?? "";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(conStrBuilder.ConnectionString)
);

// ─── Identity ─────────────────────────────────────────────────────
builder.Services
    .AddIdentity<User, IdentityRole<int>>(o =>
    {
        o.Password.RequiredLength  = 8;
        o.User.RequireUniqueEmail  = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ─── JWT ──────────────────────────────────────────────────────────
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// ─── CORS ─────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ─── Servicios ────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── Repositorios ─────────────────────────────────────────────────
builder.Services.AddScoped<IEventRepository,       EventRepository>();
builder.Services.AddScoped<ISeatRepository,        SeatRepository>();
builder.Services.AddScoped<ISectorRepository,      SectorRepository>();
builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
builder.Services.AddScoped<IAuditLogRepository,    AuditLRepository>();

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
app.UseCors("AllowAll");
app.UseAuthentication(); // ← estaba faltando este
app.UseAuthorization();
app.MapControllers();

// ─── Seed ─────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(context);
}

app.Run();