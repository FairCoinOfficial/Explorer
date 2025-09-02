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
            title: t('guide.steps.0.title'),
            description: t('guide.steps.0.description'),
            icon: Wallet,
            details: t('guide.steps.0.details')
        },
        {
            step: 2,
            title: t('guide.steps.1.title'),
            description: t('guide.steps.1.description'),
            icon: Network,
            details: t('guide.steps.1.details')
        },
        {
            step: 3,
            title: t('guide.steps.2.title'),
            description: t('guide.steps.2.description'),
            icon: Terminal,
            details: t('guide.steps.2.details')
        },
        {
            step: 4,
            title: t('guide.steps.3.title'),
            description: t('guide.steps.3.description'),
            icon: Key,
            details: t('guide.steps.3.details')
        },
        {
            step: 5,
            title: t('guide.steps.4.title'),
            description: t('guide.steps.4.description'),
            icon: Database,
            details: t('guide.steps.4.details')
        },
        {
            step: 6,
            title: t('guide.steps.5.title'),
            description: t('guide.steps.5.description'),
            icon: Shield,
            details: t('guide.steps.5.details')
        },
        {
            step: 7,
            title: t('guide.steps.6.title'),
            description: t('guide.steps.6.description'),
            icon: Settings,
            details: t('guide.steps.6.details')
        },
        {
            step: 8,
            title: t('guide.steps.7.title'),
            description: t('guide.steps.7.description'),
            icon: FileText,
            details: t('guide.steps.7.details')
        },
        {
            step: 9,
            title: t('guide.steps.8.title'),
            description: t('guide.steps.8.description'),
            icon: Monitor,
            details: t('guide.steps.8.details')
        },
        {
            step: 10,
            title: t('guide.steps.9.title'),
            description: t('guide.steps.9.description'),
            icon: Zap,
            details: t('guide.steps.9.details')
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
            title: t('requirements.hardware.title'),
            items: [
                t('requirements.hardware.items.0'),
                t('requirements.hardware.items.1'),
                t('requirements.hardware.items.2'),
                t('requirements.hardware.items.3')
            ],
            icon: Server
        },
        {
            title: t('requirements.software.title'),
            items: [
                t('requirements.software.items.0'),
                t('requirements.software.items.1'),
                t('requirements.software.items.2'),
                t('requirements.software.items.3')
            ],
            icon: Monitor
        },
        {
            title: t('requirements.network.title'),
            items: [
                t('requirements.network.items.0'),
                t('requirements.network.items.1'),
                t('requirements.network.items.2'),
                t('requirements.network.items.3')
            ],
            icon: Network
        }
    ]

    const troubleshooting = [
        {
            issue: t('troubleshooting.issues.0.issue'),
            solution: t('troubleshooting.issues.0.solution'),
            icon: AlertCircle
        },
        {
            issue: t('troubleshooting.issues.1.issue'),
            solution: t('troubleshooting.issues.1.solution'),
            icon: AlertCircle
        },
        {
            issue: t('troubleshooting.issues.2.issue'),
            solution: t('troubleshooting.issues.2.solution'),
            icon: AlertCircle
        },
        {
            issue: t('troubleshooting.issues.3.issue'),
            solution: t('troubleshooting.issues.3.solution'),
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
        { label: "requiredCollateral", value: "25,000 FAIR", icon: Shield },
        { label: "network", value: currentNetwork.toUpperCase(), icon: Globe },
        { label: "confirmationBlocks", value: "15", icon: Clock },
        { label: "activeMasternodes", value: "1,000+", icon: Users }
    ]

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{t('header.title')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('header.subtitle')}
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
                            <CardTitle className="text-sm font-medium">{t(`stats.${stat.label}`)}</CardTitle>
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
                    <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="guide">{t('tabs.guide')}</TabsTrigger>
                    <TabsTrigger value="budget">{t('tabs.budget')}</TabsTrigger>
                    <TabsTrigger value="requirements">{t('tabs.requirements')}</TabsTrigger>
                    <TabsTrigger value="troubleshooting">{t('tabs.troubleshooting')}</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    {t('overview.whatAreMasternodes.title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-muted-foreground">
                                    {t('overview.whatAreMasternodes.description')}
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• {t('overview.whatAreMasternodes.features.security')}</li>
                                    <li>• {t('overview.whatAreMasternodes.features.instantTx')}</li>
                                    <li>• {t('overview.whatAreMasternodes.features.governance')}</li>
                                    <li>• {t('overview.whatAreMasternodes.features.rewards')}</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-primary" />
                                    {t('overview.benefits.title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• {t('overview.benefits.earnRewards')}</li>
                                    <li>• {t('overview.benefits.secureNetwork')}</li>
                                    <li>• {t('overview.benefits.governance')}</li>
                                    <li>• {t('overview.benefits.ecosystem')}</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>{t('overview.important.title')}</strong> {t('overview.important.description')}
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Windows Guide Tab */}
                <TabsContent value="guide" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">{t('guide.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('guide.subtitle')}
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
                        <h3 className="text-xl font-bold tracking-tight text-center">{t('guide.configuration.title')}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        {t('guide.configuration.faircoinConf.title')}
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
                                        {t('guide.configuration.faircoinConf.copy')}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        {t('guide.configuration.masternodeConf.title')}
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
                                        {t('guide.configuration.masternodeConf.copy')}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Important Notes */}
                    <Alert>
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertDescription>
                            <strong>{t('guide.configuration.notes.title')}</strong>
                            <ul className="mt-2 space-y-1 text-sm">
                                <li>• {t('guide.configuration.notes.note1')}</li>
                                <li>• {t('guide.configuration.notes.note2')}</li>
                                <li>• {t('guide.configuration.notes.note3')}</li>
                                <li>• {t('guide.configuration.notes.note4')}</li>
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
                        <h2 className="text-2xl font-bold tracking-tight">{t('requirements.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('requirements.subtitle')}
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
                            {t('requirements.note')}
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Troubleshooting Tab */}
                <TabsContent value="troubleshooting" className="space-y-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">{t('troubleshooting.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('troubleshooting.subtitle')}
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
                            <strong>{t('troubleshooting.help.title')}</strong> {t('troubleshooting.help.description')}
                        </AlertDescription>
                    </Alert>
                </TabsContent>
            </Tabs>
        </div>
    )
}
