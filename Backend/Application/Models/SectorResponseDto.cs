using System;

namespace Application.Models;

public class SectorResponseDto
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string? Name { get; set; }
    public decimal Price { get; set; }
    public int Capacity { get; set; }
}
