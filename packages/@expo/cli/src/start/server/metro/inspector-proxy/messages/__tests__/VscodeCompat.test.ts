import { RuntimeGetProperties, VscodeCompatHandler } from '../VscodeCompat';

describe(VscodeCompatHandler, () => {
  it('responds to `Debugger.getPossibleBreakpoints` with empty `locations`', () => {
    const handler = new VscodeCompatHandler();
    const debuggerSocket = { send: jest.fn() };

    expect(
      handler.onDebuggerMessage(
        {
          id: 420,
          method: 'Debugger.getPossibleBreakpoints',
          params: {
            start: { lineNumber: 13, columnNumber: 37, scriptId: '1337' },
          },
        },
        { socket: debuggerSocket }
      )
    ).toBe(true);

    expect(debuggerSocket.send).toBeCalledWith(
      JSON.stringify({
        id: 420,
        result: { locations: [] },
      })
    );
  });

  it('mutates `Runtime.getProperties` device response with `description` properties', () => {
    const handler = new VscodeCompatHandler();
    const debuggerSocket = { send: jest.fn() };

    // This message should still be propagated, it should return `false`
    expect(
      handler.onDebuggerMessage(
        {
          id: 420,
          method: 'Runtime.getProperties',
          params: { objectId: '1337' },
        },
        { socket: debuggerSocket }
      )
    ).toBe(false);

    // The handler mutates the properties, we need to keep a reference
    const descriptors: RuntimeGetProperties['result'] = {
      result: [
        {
          name: 'foo',
          configurable: true,
          enumerable: true,
          value: { type: 'function' },
        },
        {
          name: 'bar',
          configurable: true,
          enumerable: true,
          value: { type: 'string', description: 'Dont overwrite' },
        },
      ],
    };

    // This message should still be propagated, it should return `false`
    expect(handler.onDeviceMessage({ id: 420, result: descriptors })).toBe(false);
    // Expect the descriptor values to be mutated
    expect(descriptors.result[0].value).toHaveProperty('description', '');
    expect(descriptors.result[1].value).toHaveProperty('description', 'Dont overwrite');
  });

  it('handles `Runtime.callFunctionOn` for symbol values', () => {
    const handler = new VscodeCompatHandler();
    const debuggerSocket = { send: jest.fn() };

    // Feed the handler initial property values
    handler.onDebuggerMessage(
      { id: 420, method: 'Runtime.getProperties', params: { objectId: '123' } },
      { socket: debuggerSocket }
    );
    handler.onDeviceMessage({
      id: 420,
      result: {
        result: [
          {
            name: 'foo',
            configurable: true,
            enumerable: true,
            value: { objectId: '2337', type: 'string', value: 'foostring' },
          },
          {
            name: 'bar',
            configurable: true,
            enumerable: true,
            symbol: { objectId: '1337', type: 'symbol', description: 'Symbol(bar)' },
          },
        ],
      },
    });

    // This message should not be intercepted, evaluating the `string`
    expect(
      handler.onDebuggerMessage(
        {
          id: 421,
          method: 'Runtime.callFunctionOn',
          params: {
            objectId: '2337',
            functionDeclaration: 'function() { return this.description; }',
          },
        },
        { socket: debuggerSocket }
      )
    ).toBe(false);

    // This message should be intercepted, evaluating the `symbol`
    expect(
      handler.onDebuggerMessage(
        {
          id: 422,
          method: 'Runtime.callFunctionOn',
          params: {
            objectId: '1337',
            functionDeclaration: 'function() { return this.description; }',
          },
        },
        { socket: debuggerSocket }
      )
    ).toBe(true);

    expect(debuggerSocket.send).toBeCalledWith(
      JSON.stringify({ id: 422, result: { result: { type: 'undefined' } } })
    );
  });
});
