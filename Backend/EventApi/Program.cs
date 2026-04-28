using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ─── Configuración de la BD ───────────────────────────────────────
var conStrBuilder = new SqlConnectionStringBuilder(
    builder.Configuration.GetConnectionString("DefaultConnection")
);
conStrBuilder.Password = builder.Configuration["DbPassword"];

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(conStrBuilder.ConnectionString));

// ─── Servicios ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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