import { AbstractConnectorArguments, ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector, UnsupportedChainIdError } from '@web3-react/abstract-connector'
export { UnsupportedChainIdError }

export class NoEthereumProviderError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'No Ethereum provider was found on window.ethereum.'
  }
}

export class UserRejectedRequestError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'The user rejected the request.'
  }
}

export class InjectedConnector extends AbstractConnector {
  private provider: any

  constructor(kwargs: AbstractConnectorArguments = {}) {
    super(kwargs)

    this.handleConnect = this.handleConnect.bind(this)
    this.handleNetworkChanged = this.handleNetworkChanged.bind(this)
    this.handleChainChanged = this.handleChainChanged.bind(this)
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  private handleConnect(): void {
    if (__DEV__) {
      console.log('Logging connect event')
    }
  }

  private handleNetworkChanged(networkId: string): void {
    if (__DEV__) {
      console.log('Handling networkChanged event with payload', networkId)
    }
    const chainId = parseInt(networkId)
    try {
      this.validateChainId(chainId)
      this.emitUpdate({ chainId })
    } catch (error) {
      this.emitError(error)
    }
  }

  private handleChainChanged(_chainId: string): void {
    if (__DEV__) {
      console.log('Logging chainChanged event with payload', _chainId)
    }
    // const chainId = parseInt(_chainId, 16)
    // try {
    //   this.validateChainId(chainId)
    //   this.emitUpdate({ chainId })
    // } catch (error) {
    //   this.emitError(error)
    // }
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (__DEV__) {
      console.log('Handling accountsChanged event with payload', accounts)
    }
    if (accounts.length === 0) {
      this.emitDeactivate()
    } else {
      this.emitUpdate({ account: accounts[0] })
    }
  }

  private handleClose(code: number, reason: string): void {
    if (__DEV__) {
      console.log('Logging close event with payload', code, reason)
    }
    // this.emitDeactivate()
  }

  public async activate(): Promise<ConnectorUpdate> {
    const { ethereum } = window
    if (!ethereum) {
      throw new NoEthereumProviderError()
    }
    this.provider = ethereum
    const { provider } = this

    provider.on('connect', this.handleConnect)
    provider.on('networkChanged', this.handleNetworkChanged)
    provider.on('chainChanged', this.handleChainChanged)
    provider.on('accountsChanged', this.handleAccountsChanged)
    provider.on('close', this.handleClose)

    const accounts = await provider.send('eth_requestAccounts').catch((error: Error): void => {
      if ((error as any).code === 4001) {
        throw new UserRejectedRequestError()
      }

      throw error
    })

    return { provider, account: accounts[0] }
  }

  public async getProvider(): Promise<any> {
    return this.provider
  }

  public async getChainId(): Promise<number> {
    const chainId = await this.provider.send('eth_chainId').then(({ result }: any): number => parseInt(result, 16))
    this.validateChainId(chainId)
    return chainId
  }

  public async getAccount(): Promise<null | string> {
    const accounts: string[] = await this.provider.send('eth_accounts').then(({ result }: any): string[] => result)
    return accounts[0]
  }

  public deactivate() {
    const { provider } = this
    provider.removeListener('connect', this.handleConnect)
    provider.removeListener('networkChanged', this.handleNetworkChanged)
    provider.removeListener('chainChanged', this.handleChainChanged)
    provider.removeListener('accountsChanged', this.handleAccountsChanged)
    provider.removeListener('close', this.handleClose)
    this.provider = undefined
  }
}
