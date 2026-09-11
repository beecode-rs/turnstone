const unsupportedHttpAgentError = (agentName: string): Error => {
  return new Error(`ssh2 HTTP(S) tunnel agents are unavailable on this platform: ${agentName}`)
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- stub exists only to throw a platform error on instantiation
export class SSHTTPAgent {
  constructor() {
    throw unsupportedHttpAgentError('SSHTTPAgent')
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- stub exists only to throw a platform error on instantiation
export class SSHTTPSAgent {
  constructor() {
    throw unsupportedHttpAgentError('SSHTTPSAgent')
  }
}
