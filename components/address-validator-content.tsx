"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useNetwork } from "@/contexts/network-context"
import { Wallet, CheckCircle, XCircle, Info, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SectionHeader, InfoGrid } from "@/components/ui"

interface ValidationResult {
    isValid: boolean
    addressType: string
    network: string
    error?: string
}

export function AddressValidatorContent() {
    const t = useTranslations('tools.addressValidator')
    const tCommon = useTranslations('common')
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
                error: t('errors.empty')
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
                error: t('errors.invalidLength')
            }
        }

        // Check for valid characters (Base58)
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
        if (!base58Regex.test(cleanAddress)) {
            return {
                isValid: false,
                addressType: "unknown",
                network: "unknown",
                error: t('errors.invalidCharacters')
            }
        }

        // Determine network and address type based on prefix
        if (cleanAddress.startsWith('f')) {
            // FairCoin mainnet P2PKH
            return {
                isValid: true,
                addressType: t('addressTypes.p2pkh'),
                network: "mainnet"
            }
        } else if (cleanAddress.startsWith('F')) {
            // FairCoin mainnet P2SH (multisig)
            return {
                isValid: true,
                addressType: t('addressTypes.p2sh'),
                network: "mainnet"
            }
        } else if (cleanAddress.startsWith('m') || cleanAddress.startsWith('n')) {
            // FairCoin testnet P2PKH
            return {
                isValid: true,
                addressType: t('addressTypes.p2pkhTestnet'),
                network: "testnet"
            }
        } else if (cleanAddress.startsWith('2')) {
            // Testnet P2SH (multisig)
            return {
                isValid: true,
                addressType: t('addressTypes.p2shTestnet'),
                network: "testnet"
            }
        }

        return {
            isValid: false,
            addressType: "unknown",
            network: "unknown",
            error: t('errors.unknownFormat')
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
        if (type === t('addressTypes.p2pkh')) {
            return t('addressDescriptions.p2pkh')
        } else if (type === t('addressTypes.p2sh')) {
            return t('addressDescriptions.p2sh')
        } else if (type === t('addressTypes.p2pkhTestnet')) {
            return t('addressDescriptions.p2pkhTestnet')
        } else if (type === t('addressTypes.p2shTestnet')) {
            return t('addressDescriptions.p2shTestnet')
        } else {
            return t('addressDescriptions.unknown')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <SectionHeader
                        icon={Shield}
                        title={t('validateSection.title')}
                    />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="address" className="block text-sm font-medium">
                            {t('form.label')}
                        </label>
                        <div className="flex gap-2">
                            <Input
                                id="address"
                                type="text"
                                placeholder={t('form.placeholder')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <Button
                                onClick={handleValidation}
                                disabled={!address.trim() || isValidating}
                                className="shrink-0"
                            >
                                {isValidating ? t('form.validating') : t('form.validate')}
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
                                        {validationResult.isValid ? t('results.valid') : t('results.invalid')}
                                    </span>
                                </div>

                                {validationResult.isValid ? (
                                    <div className="space-y-3">
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div>
                                                <span className="text-sm text-muted-foreground">{t('results.network')}:</span>
                                                <div className="mt-1">
                                                    <Badge className={getNetworkBadgeColor(validationResult.network)}>
                                                        {validationResult.network.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-sm text-muted-foreground">{t('results.addressType')}:</span>
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
                                                            {t('warnings.networkMismatch.title')}
                                                        </p>
                                                        <p className="text-amber-700 dark:text-amber-300">
                                                            {t('warnings.networkMismatch.description', {
                                                                addressNetwork: validationResult.network,
                                                                currentNetwork: currentNetwork
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {networkValidation && (
                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                                    {t('networkValidation.title')}
                                                </h5>
                                                <div className="text-sm space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 dark:text-blue-300">{t('networkValidation.valid')}:</span>
                                                        <span className={networkValidation.isvalid ? "text-green-600" : "text-red-600"}>
                                                            {networkValidation.isvalid ? tCommon('yes') : tCommon('no')}
                                                        </span>
                                                    </div>
                                                    {networkValidation.ismine !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">{t('networkValidation.isMine')}:</span>
                                                            <span>{networkValidation.ismine ? tCommon('yes') : tCommon('no')}</span>
                                                        </div>
                                                    )}
                                                    {networkValidation.iswatchonly !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">{t('networkValidation.watchOnly')}:</span>
                                                            <span>{networkValidation.iswatchonly ? tCommon('yes') : tCommon('no')}</span>
                                                        </div>
                                                    )}
                                                    {networkValidation.isscript !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700 dark:text-blue-300">{t('networkValidation.scriptAddress')}:</span>
                                                            <span>{networkValidation.isscript ? tCommon('yes') : tCommon('no')}</span>
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
                                                    {t('errors.title')}
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
                    <SectionHeader
                        icon={Info}
                        title={t('addressInfo.title')}
                    />
                </CardHeader>
                <CardContent>
                    <InfoGrid
                        items={[
                            { label: t('addressInfo.mainnetP2PKH'), value: t('addressInfo.mainnetP2PKHExample') },
                            { label: t('addressInfo.mainnetP2SH'), value: t('addressInfo.mainnetP2SHExample') },
                            { label: t('addressInfo.mainnetLength'), value: t('addressInfo.mainnetLengthValue') },
                            { label: t('addressInfo.mainnetUsage'), value: t('addressInfo.mainnetUsageValue') },
                            { label: t('addressInfo.testnetP2PKH'), value: t('addressInfo.testnetP2PKHValue') },
                            { label: t('addressInfo.testnetP2SH'), value: t('addressInfo.testnetP2SHValue') },
                            { label: t('addressInfo.testnetLength'), value: t('addressInfo.testnetLengthValue') },
                            { label: t('addressInfo.testnetUsage'), value: t('addressInfo.testnetUsageValue') }
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
