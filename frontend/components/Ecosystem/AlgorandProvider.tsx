import React, { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { PeraWalletConnect } from '@perawallet/connect'
import { PeraWalletArbitraryData } from '@perawallet/connect/dist/util/model/peraWalletModels'

interface WalletContextState {
    provider: PeraWalletConnect,
    connected: boolean
    isLoading: boolean
    account: string | null
    reconnect(): void
    connect(): void
    disconnect(): void
    signMessage(message: string): Promise<string>
  }
  
  // Create a context for Algorand provider
const AlgorandContext = createContext<WalletContextState | undefined>(undefined)
  
  interface AlgorandWalletProviderProps {
    children: ReactNode
    autoConnect?: boolean
  }
  
  const AlgorandWalletProvider: FC<AlgorandWalletProviderProps> = ({
    children,
    autoConnect = false,
  }: AlgorandWalletProviderProps) => {
    const [walletState, setWalletState] = useState<WalletContextState>({
      provider: new PeraWalletConnect(),
      connected: false,
      isLoading: false,
      account: null,
      reconnect: () => {},
      connect: () => {},
      disconnect: () => {},
      signMessage: async () => "",
    })
  
    useEffect(() => {
      const initWallet = async () => {
        const { provider } = walletState
        try {
            await reconnect()
        } catch (error) {
          console.error('Error reconnecting wallet:', error)
          setWalletState(prevState => ({ ...prevState, isLoading: false }))
        }
      }
  
      if (autoConnect) {
        initWallet()
      }
    }, [autoConnect, walletState.provider])

    const reconnect = async () => {
        walletState.provider
        .reconnectSession()
        .then((accounts) => {
            if (accounts.length) {
                setWalletState(prevState => ({
                    ...prevState,
                    connected: true,
                    isLoading: false,
                    account: accounts[0]
                }))
            }
      })
      .catch((e) => console.log(e));
    }
  
    const connect = async () => {
        setWalletState(prevState => ({
            ...prevState,
            isLoading: true,
        }))
        try {
            let account = await walletState.provider.reconnectSession().then(accounts => {
                return accounts[0];
            }).catch((e) => console.log(e)) || null;
            if (!account) {          
                const accounts = await walletState.provider.connect();
                account = accounts[0] || null;
            }
            setWalletState(prevState => ({
                ...prevState,
                isLoading: false,
                account,
                connected: !!account
            }))
        } catch(e) {
            console.log(e)
            setWalletState(prevState => ({
                ...prevState,
                isLoading: false,
                account: null,
                connected: false
            }))
        }
    }
  
    const disconnect = async () => {
        await walletState.provider.disconnect()
        setWalletState(prevState => ({
            ...prevState,
            isLoading: false,
            account: null,
            connected: false
        }))
    }
  
    const signMessage = async (message: string) => {
      // Implement your message signing logic
      if (walletState.account === null || !walletState.connected) {
        throw new Error("Algorand wallet not connected")
      }
      setWalletState(prevState => ({
        ...prevState,
        isLoading: true,
    }))
      const sig = await walletState.provider.signData([{ data: Buffer.from(message, "utf-8"), message } as PeraWalletArbitraryData], walletState.account)
      setWalletState(prevState => ({
        ...prevState,
        isLoading: false,
    }))
      return "0x" + Buffer.from(sig[0]).toString("hex")
    }
  
    const contextValue: WalletContextState = {
      ...walletState,
      connect,
      disconnect,
      signMessage,
    }
  
    return (
      <AlgorandContext.Provider value={contextValue}>
        {children}
      </AlgorandContext.Provider>
    )
  }
  
  export { AlgorandWalletProvider }
  
  // Custom hook to access Algorand context
  export function useWallet(): WalletContextState {
    const context = useContext(AlgorandContext)
    if (!context) {
      throw new Error('useWallet must be used within an AlgorandWalletProvider')
    }
    return context
  }