using System;
using System.Collections.Generic;

namespace Application.UseCases.Events.Commands;

public class CreateEvent
{
    public string? Name { get; set; }
    public DateTime EventDate { get; set; }
    public string? Venue { get; set; }
    public string? Status { get; set; }

    public List<CreateSector> Sectors { get; set; } = new();

}
