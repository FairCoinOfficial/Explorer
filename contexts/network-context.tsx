"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export type NetworkType = 'mainnet' | 'testnet'

interface NetworkConfig {
    name: string
    rpcHost: string
    rpcPort: number
    rpcScheme: string
    displayName: string
    shortName: string
}

const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
    mainnet: {
        name: 'mainnet',
        rpcHost: 'seed1.fairco.in',
        rpcPort: 40405,
        rpcScheme: 'http',
        displayName: 'FairCoin Mainnet',
        shortName: 'FC'
    },
    testnet: {
        name: 'testnet',
        rpcHost: '127.0.0.1', // Local testnet node
        rpcPort: 18332,
        rpcScheme: 'http',
        displayName: 'FairCoin Testnet',
        shortName: 'FT'
    }
}

interface NetworkContextType {
    currentNetwork: NetworkType
    setNetwork: (network: NetworkType) => void
    networkConfig: NetworkConfig
    networks: Record<NetworkType, NetworkConfig>
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('mainnet')

    // Load network preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('faircoin-network')
        if (saved && (saved === 'mainnet' || saved === 'testnet')) {
            setCurrentNetwork(saved)
        }
    }, [])

    const setNetwork = (network: NetworkType) => {
        setCurrentNetwork(network)
        localStorage.setItem('faircoin-network', network)
    }

    const value: NetworkContextType = {
        currentNetwork,
        setNetwork,
        networkConfig: NETWORK_CONFIGS[currentNetwork],
        networks: NETWORK_CONFIGS
    }

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    )
}

export function useNetwork() {
    const context = useContext(NetworkContext)
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider')
    }
    return context
}
