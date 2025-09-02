"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import { useNetwork } from "@/contexts/network-context"
import {
    Server,
    Shield,
    Award,
    Settings,
    FileText,
    Copy,
    CheckCircle,
    AlertCircle,
    Info,
    Monitor,
    Terminal,
    Wallet,
    Network,
    Zap,
    Key,
    Database,
    Users,
    Clock,
    Globe,
    Vote,
    DollarSign,
    Calendar,
    Link
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function MasternodesContent() {
    const t = useTranslations('masternodes')
    const { currentNetwork } = useNetwork()
    const [activeTab, setActiveTab] = useState("overview")

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text)
        }).catch(err => {
            console.error('Failed to copy text: ', err)
        })
    }

    const masternodeSteps = [
        {
            step: 1,
            title: "Open FairCoin Wallet",
            description: "Launch faircoin-qt.exe for the first time",
            icon: Wallet,
            details: "Run the FairCoin wallet application. Your firewall and antivirus might pop up to allow connections - please allow them by making appropriate tick marks."
        },
        {
            step: 2,
            title: "Wait for Synchronization",
            description: "Ensure wallet is fully synced with network",
            icon: Network,
            details: "In the lower left corner, you'll see 'Synchronizing with network' and other sync messages. If you see 'No Block Source Available', close and re-open the wallet until it synchronizes."
        },
        {
            step: 3,
            title: "Access Debug Console",
            description: "Go to Help → Debug Console",
            icon: Terminal,
            details: "Open the debug console from the Help menu to access wallet commands."
        },
        {
            step: 4,
            title: "Get Deposit Address",
            description: "Generate your masternode deposit address",
            icon: Key,
            details: "In the console, enter: getaccountaddress 0. Copy the result - this is your MASTERNODE DEPOSIT ADDRESS where you'll deposit exactly 25,000 FAIR coins."
        },
        {
            step: 5,
            title: "Deposit Coins",
            description: "Send exactly 25,000 FAIR to deposit address",
            icon: Database,
            details: "Pay exactly 25,000 FAIR coins (no more, no less) to your masternode deposit address. Wait for 15 confirmations of the transaction."
        },
        {
            step: 6,
            title: "Generate Private Key",
            description: "Create your masternode private key",
            icon: Shield,
            details: "In the debug console, enter: masternode genkey. Copy the result - this is your MASTERNODE PRIVKEY."
        },
        {
            step: 7,
            title: "Configure faircoin.conf",
            description: "Set up wallet configuration file",
            icon: Settings,
            details: "Open C:/users/[username]/appdata/roaming/faircoin/faircoin.conf in Notepad and add the required configuration parameters."
        },
        {
            step: 8,
            title: "Configure masternode.conf",
            description: "Set up masternode configuration file",
            icon: FileText,
            details: "Open C:/users/[username]/appdata/roaming/faircoin/masternode.conf and add your masternode entry with the correct parameters."
        },
        {
            step: 9,
            title: "Restart Wallet",
            description: "Close and reopen wallet to apply changes",
            icon: Monitor,
            details: "Close the wallet (File → Exit) and reopen it by running faircoin-qt.exe. This is how you'll always start the wallet going forward."
        },
        {
            step: 10,
            title: "Start Masternode",
            description: "Activate your masternode from the wallet",
            icon: Zap,
            details: "Wait for 15 confirmations, then go to the Masternodes tab and click 'Start all' or 'Start alias'. You should see 'Masternode started successfully'."
        }
    ]

    const configExamples = {
        faircoinConf: `rpcuser=ANYTHINGHERE
rpcpassword=ANYTHINGHERE
listen=1
server=1
daemon=1
allowip=127.0.0.1
masternode=1
externalip=YOURIP
masternodeaddr=127.0.0.1:53472
masternodeprivkey=PRIVATEKEYREPLACETHIS`,
        masternodeConf: `mn1 127.0.0.1:53472 PRIVATEKEYREPLACETHIS INSERTYOURTXID 0`
    }

    const requirements = [
        {
            title: "Hardware Requirements",
            items: [
                "Dedicated VPS or server (24/7 uptime)",
                "Minimum 1GB RAM",
                "Minimum 10GB storage",
                "Stable internet connection"
            ],
            icon: Server
        },
        {
            title: "Software Requirements",
            items: [
                "FairCoin wallet (faircoin-qt.exe)",
                "Windows operating system",
                "Firewall access for port 53472",
                "Administrator privileges"
            ],
            icon: Monitor
        },
        {
            title: "Network Requirements",
            items: [
                "25,000 FAIR coins (exact amount)",
                "15 confirmations for activation",
                "Stable network connection",
                "Port 53472 open and accessible"
            ],
            icon: Network
        }
    ]

    const troubleshooting = [
        {
            issue: "Wallet won't synchronize",
            solution: "Close and reopen the wallet. If the problem persists, check your internet connection and firewall settings.",
            icon: AlertCircle
        },
        {
            issue: "Masternode not starting",
            solution: "Verify all configuration files are correct, ensure 15 confirmations are received, and check that port 53472 is accessible.",
            icon: AlertCircle
        },
        {
            issue: "Configuration file not found",
            solution: "The faircoin.conf file is located in the hidden AppData folder. Enable 'Show hidden files' in Windows Explorer.",
            icon: AlertCircle
        },
        {
            issue: "Masternode status not updating",
            solution: "Wait for network propagation. Masternodes need to be active for a certain number of blocks before being recognized by the network.",
            icon: AlertCircle
        }
    ]

    const budgetStages = [
        {
            stage: t('budget.stages.prepare.title'),
            description: t('budget.stages.prepare.description'),
            icon: FileText,
            details: t('budget.stages.prepare.details')
        },
        {
            stage: t('budget.stages.submit.title'),
            description: t('budget.stages.submit.description'),
            icon: Network,
            details: t('budget.stages.submit.details')
        },
        {
            stage: t('budget.stages.voting.title'),
            description: t('budget.stages.voting.description'),
            icon: Vote,
            details: t('budget.stages.voting.details')
        },
        {
            stage: t('budget.stages.finalization.title'),
            description: t('budget.stages.finalization.description'),
            icon: Calendar,
            details: t('budget.stages.finalization.details')
        },
        {
            stage: t('budget.stages.budgetVoting.title'),
            description: t('budget.stages.budgetVoting.description'),
            icon: Vote,
            details: t('budget.stages.budgetVoting.details')
        },
        {
            stage: t('budget.stages.payment.title'),
            description: t('budget.stages.payment.description'),
            icon: DollarSign,
            details: t('budget.stages.payment.details')
        }
    ]

    const budgetCommands = [
        {
            command: t('budget.commands.prepare.name'),
            description: t('budget.commands.prepare.description'),
            example: t('budget.commands.prepare.example'),
            output: t('budget.commands.prepare.output'),
            copy: t('budget.commands.prepare.copy')
        },
        {
            command: t('budget.commands.submit.name'),
            description: t('budget.commands.submit.description'),
            example: t('budget.commands.submit.example'),
            output: t('budget.commands.submit.output'),
            copy: t('budget.commands.submit.copy')
        },
        {
            command: t('budget.commands.getinfo.name'),
            description: t('budget.commands.getinfo.description'),
            example: t('budget.commands.getinfo.example'),
            output: t('budget.commands.getinfo.output'),
            copy: t('budget.commands.getinfo.copy')
        },
        {
            command: t('budget.commands.vote.name'),
            description: t('budget.commands.vote.description'),
            example: t('budget.commands.vote.example'),
            output: t('budget.commands.vote.output'),
            copy: t('budget.commands.vote.copy')
        },
        {
            command: t('budget.commands.projection.name'),
            description: t('budget.commands.projection.description'),
            example: t('budget.commands.projection.example'),
            output: t('budget.commands.projection.output'),
            copy: t('budget.commands.projection.copy')
        },
        {
            command: t('budget.commands.finalbudget.name'),
            description: t('budget.commands.finalbudget.description'),
            example: t('budget.commands.finalbudget.example'),
            output: t('budget.commands.finalbudget.output'),
            copy: t('budget.commands.finalbudget.copy')
        }
    ]

    const stats = [
        { label: "Required Collateral", value: "25,000 FAIR", icon: Shield },
        { label: "Network", value: currentNetwork.toUpperCase(), icon: Globe },
        { label: "Confirmation Blocks", value: "15", icon: Clock },
        { label: "Active Masternodes", value: "1,000+", icon: Users }
    ]

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Masternodes</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Run a FairCoin masternode and earn rewards while securing the network
                    </p>
                </div>
                <Badge variant="outline" className="text-sm">
                    {currentNetwork.toUpperCase()}
                        </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                            <stat.icon className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="guide">Windows Guide</TabsTrigger>
                    <TabsTrigger value="budget">Budget API</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    What are Masternodes?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-muted-foreground">
                                    Masternodes are special nodes in the FairCoin network that provide additional services beyond simple transaction validation.
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Enhanced network security and stability</li>
                                    <li>• Instant transaction processing</li>
                                    <li>• Decentralized governance participation</li>
                                    <li>• Regular reward distribution</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-primary" />
                                    Benefits
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Earn regular FAIR coin rewards</li>
                                    <li>• Contribute to network security</li>
                                    <li>• Participate in network governance</li>
                                    <li>• Support FairCoin ecosystem growth</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>Important:</strong> Running a masternode requires exactly 25,000 FAIR coins as collateral.
                            These coins remain in your wallet and are not spent, but they must stay there for the masternode to remain active.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Windows Guide Tab */}
                <TabsContent value="guide" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">MASTERNODE GUIDE FOR WINDOWS</h2>
                        <p className="text-muted-foreground">
                            Follow these step-by-step instructions to set up your FairCoin masternode on Windows
                        </p>
                    </div>

                    {/* Step-by-Step Guide */}
                    <div className="space-y-4">
                        {masternodeSteps.map((step, index) => (
                            <Card key={index}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-primary font-bold text-lg">{step.step}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <step.icon className="h-4 w-4 text-primary" />
                                                <h3 className="text-lg font-semibold">{step.title}</h3>
                                            </div>
                                            <p className="text-primary font-medium mb-2">{step.description}</p>
                                            <p className="text-muted-foreground text-sm">{step.details}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Configuration Files */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold tracking-tight text-center">Configuration Files</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        faircoin.conf
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                        <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">{configExamples.faircoinConf}</pre>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => copyToClipboard(configExamples.faircoinConf)}
                                    >
                                        <Copy className="h-4 w-4 mr-2 text-primary" />
                                        Copy Configuration
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        masternode.conf
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                        <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">{configExamples.masternodeConf}</pre>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => copyToClipboard(configExamples.masternodeConf)}
                                    >
                                        <Copy className="h-4 w-4 mr-2 text-primary" />
                                        Copy Configuration
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Important Notes */}
                    <Alert>
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>Important Notes:</strong>
                            <ul className="mt-2 space-y-1 text-sm">
                                <li>• Replace YOURIP with your actual external IP address</li>
                                <li>• Replace PRIVATEKEYREPLACETHIS with your generated masternode private key</li>
                                <li>• Replace INSERTYOURTXID with the transaction ID of your 25,000 FAIR deposit</li>
                                <li>• All masternodes need to be active for a certain amount of blocks before they are recognized by the network and eligible for rewards</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Budget API Tab */}
                <TabsContent value="budget" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">{t('budget.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('budget.description')}
                        </p>
                    </div>

                    {/* Budget Stages */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold tracking-tight">{t('budget.sections.budgetStages')}</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {budgetStages.map((stage, index) => (
                                <Card key={index} className="h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <stage.icon className="h-4 w-4 text-primary" />
                                            {stage.stage}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-primary font-medium text-sm">{stage.description}</p>
                                        <p className="text-muted-foreground text-xs">{stage.details}</p>
                                    </CardContent>
                                </Card>
                            ))}
                            </div>
                    </div>

                    {/* Budget Commands */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold tracking-tight">{t('budget.sections.budgetCommands')}</h3>
                        <div className="space-y-4">
                            {budgetCommands.map((cmd, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Terminal className="h-4 w-4 text-primary" />
                                            {cmd.command}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-muted-foreground text-sm">{cmd.description}</p>
                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-sm font-medium text-primary">{t('budget.sections.example')}</span>
                                                <div className="bg-muted p-3 rounded-lg mt-1">
                                                    <code className="text-xs text-foreground font-mono">{cmd.example}</code>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-primary">{t('budget.sections.output')}</span>
                                                <div className="bg-muted p-3 rounded-lg mt-1">
                                                    <code className="text-xs text-foreground font-mono">{cmd.output}</code>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => copyToClipboard(cmd.example)}
                                        >
                                            <Copy className="h-4 w-4 mr-2 text-primary" />
                                            {cmd.copy}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Important Information */}
                    <Alert>
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>{t('budget.sections.important')}:</strong> {t('budget.alerts.votingRequirement')}
                        </AlertDescription>
                    </Alert>

                    <Alert>
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>{t('budget.sections.warning')}:</strong> {t('budget.alerts.collateralWarning')}
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Requirements Tab */}
                <TabsContent value="requirements" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Masternode Requirements</h2>
                        <p className="text-muted-foreground">
                            Ensure you meet all requirements before setting up your masternode
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                        {requirements.map((req, index) => (
                            <Card key={index} className="h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <req.icon className="h-4 w-4 text-primary" />
                                        {req.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {req.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-muted-foreground">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Alert>
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>Note:</strong> These requirements ensure your masternode runs reliably and contributes effectively to the FairCoin network.
                            Meeting all requirements is essential for successful masternode operation.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Troubleshooting Tab */}
                <TabsContent value="troubleshooting" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Troubleshooting Guide</h2>
                        <p className="text-muted-foreground">
                            Common issues and their solutions when setting up your masternode
                        </p>
                    </div>

                    <div className="space-y-4">
                        {troubleshooting.map((item, index) => (
                            <Card key={index}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold mb-2">{item.issue}</h4>
                                            <p className="text-muted-foreground text-sm">{item.solution}</p>
                                        </div>
                            </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>Need Help?</strong> If you&apos;re still experiencing issues after trying these solutions,
                            please check the FairCoin community forums or Discord for additional support.
                        </AlertDescription>
                    </Alert>
                </TabsContent>
            </Tabs>
        </div>
    )
}
