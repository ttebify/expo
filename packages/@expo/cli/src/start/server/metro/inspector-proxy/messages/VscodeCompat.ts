import type { Protocol } from 'devtools-protocol';
import type { DebuggerInfo } from 'metro-inspector-proxy';

import { CdpMessage, DebuggerRequest, DeviceResponse, InspectorHandler } from './types';

export class VscodeCompatHandler implements InspectorHandler {
  /** Keep track of device messages to intercept, by request id */
  interceptDeviceMessage = new Set<number>();
  /** Keep track of symbol evaluations that cause Hermes to crash when executing `Runtime.callFunctionOn`, by `RemoteObjectId` */
  interceptSymbolEvaluations = new Set<Protocol.Runtime.RemoteObjectId>();

  onDebuggerMessage(
    message:
      | DebuggerRequest<DebuggerGetPossibleBreakpoints>
      | DebuggerRequest<RuntimeGetProperties>
      | DebuggerRequest<RuntimeCallFunctionOn>,
    { socket }: Pick<DebuggerInfo, 'socket'>
  ) {
    // Hermes doesn't seem to handle this request, but `locations` have to be returned.
    // Respond with an empty location to make it "spec compliant" with Chrome DevTools.
    if (message.method === 'Debugger.getPossibleBreakpoints') {
      const response: DeviceResponse<DebuggerGetPossibleBreakpoints> = {
        id: message.id,
        result: { locations: [] },
      };
      socket.send(JSON.stringify(response));
      return true;
    }

    // Vscode doesn't seem to work nicely with missing `description` fields on `RemoteObject` instances.
    // See: https://github.com/microsoft/vscode-js-debug/issues/1583
    if (message.method === 'Runtime.getProperties') {
      this.interceptDeviceMessage.add(message.id);
    }

    // Keep track of symbol values that MUST NOT be evaluated
    // Vscode seems to evaluate these, while chrome devtools doesn't.
    // See: https://github.com/microsoft/vscode-js-debug/blob/37768447047ebd19a782e09172b39c18fb4a35c4/src/adapter/objectPreview/index.ts#L23-L27
    if (
      message.method === 'Runtime.callFunctionOn' &&
      message.params.objectId &&
      this.interceptSymbolEvaluations.has(message.params.objectId)
    ) {
      const response: DeviceResponse<RuntimeCallFunctionOn> = {
        id: message.id,
        result: { result: { type: 'undefined' } },
      };
      socket.send(JSON.stringify(response));
      return true;
    }

    return false;
  }

  onDeviceMessage(message: DeviceResponse<RuntimeGetProperties>) {
    // Vscode doesn't seem to work nicely with missing `description` fields on `RemoteObject` instances.
    // See: https://github.com/microsoft/vscode-js-debug/issues/1583
    if (this.interceptDeviceMessage.has(message.id)) {
      this.interceptDeviceMessage.delete(message.id);

      for (const item of message.result.result ?? []) {
        // Force-fully format the properties description to be an empty string
        if (item.value) {
          item.value.description = item.value.description ?? '';
        }

        // Keep track of symbol values that MUST NOT be evaluated
        // Vscode seems to evaluate these, while chrome devtools doesn't.
        // See: https://github.com/microsoft/vscode-js-debug/blob/37768447047ebd19a782e09172b39c18fb4a35c4/src/adapter/objectPreview/index.ts#L23-L27
        if (item.symbol?.type === 'symbol' && item.symbol?.objectId) {
          this.interceptSymbolEvaluations.add(item.symbol.objectId);
        }
      }
    }

    return false;
  }
}

/** @see https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-getPossibleBreakpoints */
export type DebuggerGetPossibleBreakpoints = CdpMessage<
  'Debugger.getPossibleBreakpoints',
  Protocol.Debugger.GetPossibleBreakpointsRequest,
  Protocol.Debugger.GetPossibleBreakpointsResponse
>;

/** @see https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-getProperties */
export type RuntimeGetProperties = CdpMessage<
  'Runtime.getProperties',
  Protocol.Runtime.GetPropertiesRequest,
  Protocol.Runtime.GetPropertiesResponse
>;

/** @see https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-callFunctionOn */
export type RuntimeCallFunctionOn = CdpMessage<
  'Runtime.callFunctionOn',
  Protocol.Runtime.CallFunctionOnRequest,
  Protocol.Runtime.CallFunctionOnResponse
>;
