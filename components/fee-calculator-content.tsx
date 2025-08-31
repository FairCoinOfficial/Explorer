"use client"

import { useState, useEffect, useMemo } from "react"
import { useNetwork } from "@/contexts/network-context"
import { Calculator, Info, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export function FeeCalculatorContent() {
    const { currentNetwork } = useNetwork()
    const [amount, setAmount] = useState("")
    const [priority, setPriority] = useState("standard")
    const [estimatedFee, setEstimatedFee] = useState(0)
    const [totalCost, setTotalCost] = useState(0)

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
                return "~30-60 minutes confirmation"
            case "standard":
                return "~10-20 minutes confirmation"
            case "high":
                return "~5-10 minutes confirmation"
            case "priority":
                return "~2-5 minutes confirmation"
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
                <h1 className="text-2xl font-bold">Fee Calculator</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            Transaction Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="amount" className="block text-sm font-medium">Amount (FAIR)</label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Enter amount to send"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.00000001"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="priority" className="block text-sm font-medium">Fee Priority</label>
                            <select 
                                value={priority} 
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                            >
                                <option value="low">Low Priority</option>
                                <option value="standard">Standard</option>
                                <option value="high">High Priority</option>
                                <option value="priority">Maximum Priority</option>
                            </select>
                            <p className="text-sm text-muted-foreground">
                                {getPriorityDescription(priority)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Fee Rate</label>
                            <div className="flex items-center gap-2">
                                <Badge className={getPriorityColor(priority)}>
                                    {feeRates[priority as keyof typeof feeRates]} FAIR/KB
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Fee Estimate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {amount && parseFloat(amount) > 0 ? (
                            <>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Amount:</span>
                                        <span className="font-mono">{parseFloat(amount).toFixed(8)} FAIR</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Estimated Fee:</span>
                                        <span className="font-mono text-orange-600 dark:text-orange-400">
                                            {estimatedFee.toFixed(8)} FAIR
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center font-semibold">
                                        <span>Total Cost:</span>
                                        <span className="font-mono">
                                            {totalCost.toFixed(8)} FAIR
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>• Estimated transaction size: ~{Math.ceil(estimateTransactionSize(parseFloat(amount)) * 1000)} bytes</p>
                                    <p>• Fee calculation based on {priority} priority</p>
                                    <p>• Actual fees may vary based on network conditions</p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Enter an amount to calculate fees</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Fee Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h4 className="font-semibold mb-2">FairCoin Transaction Fees</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Minimum fee: 0.0001 FAIR</li>
                                <li>• Fee per KB varies by priority</li>
                                <li>• FastSend: Higher fee for instant confirmation</li>
                                <li>• PrivateSend: Additional mixing fees apply</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Network Information</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Block time: ~120 seconds</li>
                                <li>• Current network: {currentNetwork}</li>
                                <li>• Confirmation time varies by priority</li>
                                <li>• 6 confirmations recommended</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
