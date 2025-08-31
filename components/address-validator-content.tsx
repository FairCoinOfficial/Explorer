"use client"

import { useState } from "react"
import { useNetwork } from "@/contexts/network-context"
import { Wallet, CheckCircle, XCircle, Info, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ValidationResult {
    isValid: boolean
    addressType: string
    network: string
    error?: string
}

export function AddressValidatorContent() {
    const { currentNetwork } = useNetwork()
    const [address, setAddress] = useState("")
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [networkValidation, setNetworkValidation] = useState<any>(null)

    // FairCoin address validation
    const validateAddress = (address: string): ValidationResult => {
        if (!address || address.trim() === "") {
            return {
                isValid: false,
                addressType: "unknown",
                network: "unknown",
                error: "Address cannot be empty"
            }
        }

        // Remove whitespace
        const cleanAddress = address.trim()

        // FairCoin mainnet addresses start with 'f'
        // FairCoin testnet addresses start with 'm' or 'n'
        // Legacy addresses are 34 characters long
        // New segwit addresses may vary

        if (cleanAddress.length < 25 || cleanAddress.length > 62) {
            return {
                isValid: false,
                addressType: "unknown",
                network: "unknown",
                error: "Invalid address length"
            }
        }

        // Check for valid characters (Base58)
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
        if (!base58Regex.test(cleanAddress)) {
            return {
                isValid: false,
                addressType: "unknown", 
                network: "unknown",
                error: "Invalid characters in address (must be Base58)"
            }
        }

        // Determine network and address type based on prefix
        if (cleanAddress.startsWith('f')) {
            // FairCoin mainnet P2PKH
            return {
                isValid: true,
                addressType: "P2PKH (Pay to Public Key Hash)",
                network: "mainnet"
            }
        } else if (cleanAddress.startsWith('F')) {
            // FairCoin mainnet P2SH (multisig)
            return {
                isValid: true,
                addressType: "P2SH (Pay to Script Hash - Multisig)",
                network: "mainnet"
            }
        } else if (cleanAddress.startsWith('m') || cleanAddress.startsWith('n')) {
            // FairCoin testnet P2PKH
            return {
                isValid: true,
                addressType: "P2PKH (Testnet)",
                network: "testnet"
            }
        } else if (cleanAddress.startsWith('2')) {
            // Testnet P2SH (multisig)
            return {
                isValid: true,
                addressType: "P2SH (Testnet - Multisig)",
                network: "testnet"
            }
        }

        return {
            isValid: false,
            addressType: "unknown",
            network: "unknown",
            error: "Unknown address format"
        }
    }

    const handleValidation = async () => {
        setIsValidating(true)
        
        // Local validation first
        const localResult = validateAddress(address)
        setValidationResult(localResult)
        
        // Network validation if locally valid
        if (localResult.isValid) {
            try {
                const response = await fetch(`/api/validate-address?address=${encodeURIComponent(address.trim())}&network=${currentNetwork}`)
                if (response.ok) {
                    const networkResult = await response.json()
                    setNetworkValidation(networkResult)
                }
            } catch (error) {
                console.error("Network validation failed:", error)
            }
        } else {
            setNetworkValidation(null)
        }
        
        setIsValidating(false)
    }

    const getNetworkBadgeColor = (network: string) => {
        switch (network) {
            case "mainnet":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            case "testnet":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            default:
                return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        }
    }

    const getTypeDescription = (type: string) => {
        switch (type) {
            case "P2PKH (Pay to Public Key Hash)":
                return "Standard single-signature address"
            case "P2SH (Pay to Script Hash - Multisig)":
                return "Multi-signature address (created with addmultisigaddress)"
            case "P2PKH (Testnet)":
                return "Testnet single-signature address"
            case "P2SH (Testnet - Multisig)":
                return "Testnet multi-signature address"
            default:
                return "Unknown address type"
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Address Validator</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Validate FairCoin Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="address" className="block text-sm font-medium">
                            FairCoin Address
                        </label>
                        <div className="flex gap-2">
                            <Input
                                id="address"
                                type="text"
                                placeholder="Enter FairCoin address to validate"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <Button 
                                onClick={handleValidation}
                                disabled={!address.trim() || isValidating}
                                className="shrink-0"
                            >
                                {isValidating ? "Validating..." : "Validate"}
                            </Button>
                        </div>
                    </div>

                    {validationResult && (
                        <div className="space-y-4">
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {validationResult.isValid ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <span className="font-semibold">
                                        {validationResult.isValid ? "Valid Address" : "Invalid Address"}
                                    </span>
                                </div>

                                {validationResult.isValid ? (
                                    <div className="space-y-3">
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div>
                                                <span className="text-sm text-muted-foreground">Network:</span>
                                                <div className="mt-1">
                                                    <Badge className={getNetworkBadgeColor(validationResult.network)}>
                                                        {validationResult.network.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-sm text-muted-foreground">Address Type:</span>
                                                <div className="mt-1">
                                                    <p className="text-sm font-medium">{validationResult.addressType}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {getTypeDescription(validationResult.addressType)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {validationResult.network !== currentNetwork && (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                                                <div className="flex items-start gap-2">
                                                    <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                                                    <div className="text-sm">
                                                        <p className="font-medium text-amber-800 dark:text-amber-200">
                                                            Network Mismatch
                                                        </p>
                                                        <p className="text-amber-700 dark:text-amber-300">
                                                            This address is for {validationResult.network} but you&apos;re currently on {currentNetwork}.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {networkValidation && (
                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                                    Network Validation Results
                                                </h5>
                                                <div className="text-sm space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 dark:text-blue-300">Valid:</span>
                                                        <span className={networkValidation.isvalid ? "text-green-600" : "text-red-600"}>
                                                            {networkValidation.isvalid ? "Yes" : "No"}
                                                        </span>
                                                    </div>
                                                    {networkValidation.ismine !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">Is Mine:</span>
                                                            <span>{networkValidation.ismine ? "Yes" : "No"}</span>
                                                        </div>
                                                    )}
                                                    {networkValidation.iswatchonly !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">Watch Only:</span>
                                                            <span>{networkValidation.iswatchonly ? "Yes" : "No"}</span>
                                                        </div>
                                                    )}
                                                    {networkValidation.isscript !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">Script Address:</span>
                                                            <span>{networkValidation.isscript ? "Yes" : "No"}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="font-medium text-red-800 dark:text-red-200">
                                                    Validation Error
                                                </p>
                                                <p className="text-red-700 dark:text-red-300">
                                                    {validationResult.error}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Address Format Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h4 className="font-semibold mb-2">Mainnet Addresses</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• P2PKH: Starts with &apos;f&apos; (e.g., f1234...)</li>
                                <li>• P2SH: Starts with &apos;F&apos; (e.g., F5678...)</li>
                                <li>• Length: 25-34 characters</li>
                                <li>• Used for real transactions</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Testnet Addresses</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• P2PKH: Starts with &apos;m&apos; or &apos;n&apos;</li>
                                <li>• P2SH: Starts with &apos;2&apos;</li>
                                <li>• Length: 25-34 characters</li>
                                <li>• Used for testing only</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
