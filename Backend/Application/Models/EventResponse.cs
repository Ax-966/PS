using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Models
{
    public class EventResponse
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public DateTime EventDate { get; set; }
        public string? Venue { get; set; }
        public string? Status { get; set; }
    }
}
