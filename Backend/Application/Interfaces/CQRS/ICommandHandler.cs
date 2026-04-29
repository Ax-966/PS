using System;

namespace Application.Interfaces.CQRS;

public interface ICommandHandler<TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command);
}
