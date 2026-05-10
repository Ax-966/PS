using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Exceptions
{
    public class SeatReservationConflictException : Exception
    {
        public SeatReservationConflictException(string message) : base(message)
        {
        }
    }
}
