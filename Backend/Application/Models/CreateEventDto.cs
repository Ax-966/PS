using System;

namespace Application.Models;

public class CreateEventDto
{
    public string? Name { get; set; }
    public DateTime EventDate { get; set; }
    public string? Venue { get; set; }
    public string? Status { get; set; }
}
