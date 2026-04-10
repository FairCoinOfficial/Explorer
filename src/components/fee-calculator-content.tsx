import { useState, useEffect, useMemo } from "react"
import { useNetwork } from "@/contexts/network-context"
import { Calculator, Info, Coins, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SectionHeader, EmptyState, InfoGrid } from "@/components/ui"
import { toast } from 'sonner'
import { useTranslations } from "@/lib/i18n"

export function FeeCalculatorContent() {
    const { currentNetwork } = useNetwork()
    const [amount, setAmount] = useState("")
    const [priority, setPriority] = useState("standard")
    const [estimatedFee, setEstimatedFee] = useState(0)
    const [totalCost, setTotalCost] = useState(0)
    const t = useTranslations('tools.feeCalculator')

    // FairCoin fee structure
    const feeRates = useMemo(() => ({
        low: 0.0001,      // 0.0001 FAIR per KB
        standard: 0.0002, // 0.0002 FAIR per KB  
        high: 0.0005,     // 0.0005 FAIR per KB
        priority: 0.001   // 0.001 FAIR per KB
    }), [])

    // Estimate transaction size based on inputs/outputs
    const estimateTransactionSize = (amountValue: number) => {
        // Basic transaction: ~250 bytes
        // Additional inputs: ~180 bytes each
        // Additional outputs: ~34 bytes each
        const baseSize = 250
        const additionalInputs = Math.floor(amountValue / 1000) // Estimate inputs needed
        const additionalSize = additionalInputs * 180
        return (baseSize + additionalSize) / 1000 // Convert to KB
    }

    useEffect(() => {
        const amountValue = parseFloat(amount) || 0
        if (amountValue > 0) {
            const txSizeKB = estimateTransactionSize(amountValue)
            const feeRate = feeRates[priority as keyof typeof feeRates]
            const fee = txSizeKB * feeRate
            setEstimatedFee(fee)
            setTotalCost(amountValue + fee)
        } else {
            setEstimatedFee(0)
            setTotalCost(0)
        }
    }, [amount, priority, feeRates])

    const getPriorityDescription = (priority: string) => {
        switch (priority) {
            case "low":
                return t('lowPriorityDescription')
            case "standard":
                return t('standardPriorityDescription')
            case "high":
                return t('highPriorityDescription')
            case "priority":
                return t('instantXDescription')
            default:
                return ""
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "low":
                return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            case "standard":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            case "high":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            case "priority":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            default:
                return ""
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <SectionHeader
                            icon={Coins}
                            title={t('transactionDetails')}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="amount" className="block text-sm font-medium">{t('amount')} (FAIR)</label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder={t('amountPlaceholder')}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.00000001"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="priority" className="block text-sm font-medium">{t('feePriority')}</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                            >
                                <option value="low">{t('lowPriority')}</option>
                                <option value="standard">{t('standardPriority')}</option>
                                <option value="high">{t('highPriority')}</option>
                                <option value="priority">{t('instantX')}</option>
                            </select>
                            <p className="text-sm text-muted-foreground">
                                {getPriorityDescription(priority)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium">{t('feeRate')}</label>
                            <div className="flex items-center gap-2">
                                <Badge className={getPriorityColor(priority)}>
                                    {feeRates[priority as keyof typeof feeRates]} FAIR/KB
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('feeEstimate')}</h3>
                    {amount && parseFloat(amount) > 0 ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">{t('amount')}</p>
                                    <p className="text-lg font-bold font-mono tabular-nums">{parseFloat(amount).toFixed(8)} FAIR</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">{t('estimatedFee')}</p>
                                    <p className="text-lg font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400">
                                        {estimatedFee.toFixed(8)} FAIR
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">{t('totalCost')}</p>
                                    <p className="text-lg font-bold font-mono tabular-nums">{totalCost.toFixed(8)} FAIR</p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>• {t('estimatedSize', { bytes: Math.ceil(estimateTransactionSize(parseFloat(amount)) * 1000) })}</p>
                                <p>• {t('feeCalculationBased', { priority: priority })}</p>
                                <p>• {t('actualFeesDisclaimer')}</p>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Calculator}
                            title={t('enterAmountTitle')}
                            description={t('enterAmountDescription')}
                        />
                    )}
                </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('feeInformation')}</h3>
                <InfoGrid
                    items={[
                        { label: t('standardTransactions'), value: t('standardMinimum') },
                        { label: t('instantXLabel'), value: t('nearInstantConfirmation') },
                        { label: t('privateSendLabel'), value: t('enhancedPrivacy') },
                        { label: t('multiSigSupport'), value: t('available') },
                        { label: t('blockTime'), value: t('blockTimeValue') },
                        { label: t('currentNetwork'), value: currentNetwork },
                        { label: t('confirmationTime'), value: t('variesByPriority') },
                        { label: t('recommendedConfirmations'), value: t('sixConfirmations') }
                    ]}
                />
            </div>
        </div>
    )
}
