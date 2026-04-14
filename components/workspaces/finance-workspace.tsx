"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  companyFinancials,
  getTotalReceivables,
  getHighRiskCompanies,
  getNormalizedCompanies,
  getMemberByInitials,
  rawRegistrations,
  type CompanyFinancials,
  type RegistrationStatus,
} from "@/lib/data"
import {
  AlertTriangle,
  DollarSign,
  Mail,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  ChevronRight,
  CreditCard,
  Bell,
  Send,
} from "lucide-react"
import { toast } from "sonner"

// Statuses that require outreach if older than 14 days without assignment
const outreachStatuses: RegistrationStatus[] = [
  "BTT Pending",
  "BTT Confirmed",
  "BTT Rejected",
  "1 to 2 Day Pending",
  "1 to 2 Day Accepted",
  "1 to 2 Day Rejected",
  "Pending",
  "Waitlisted",
]

function getRiskBadge(risk: CompanyFinancials["debtRiskFlag"]) {
  switch (risk) {
    case "High":
      return <Badge variant="destructive">High Risk</Badge>
    case "Medium":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Medium Risk</Badge>
    case "Low":
      return <Badge variant="secondary">Low Risk</Badge>
    case "None":
      return <Badge variant="outline" className="text-green-600 border-green-300">Clear</Badge>
  }
}

function getPaymentStatusIcon(status: "Paid" | "Pending" | "Overdue") {
  switch (status) {
    case "Paid":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case "Pending":
      return <Clock className="h-4 w-4 text-amber-500" />
    case "Overdue":
      return <XCircle className="h-4 w-4 text-destructive" />
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function generateReminderEmail(company: CompanyFinancials): string {
  const overduePayments = company.paymentsHistory.filter(p => p.status === "Overdue")
  const overdueSemesters = overduePayments.map(p => p.semester).join(", ")
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  return `Subject: Outstanding Balance Notice - TAMU SEC Career Fair

Dear ${company.companyName} Accounts Payable Team,

We are writing to notify you of an outstanding balance on your account with the Texas A&M University Student Engineering Council Career Fair program.

Account Summary:
- Company: ${company.companyName}
- Total Balance Due: ${formatCurrency(company.balanceDue)}
- Overdue Since: ${overdueSemesters || "N/A"}
- Overdue Amount: ${formatCurrency(totalOverdue)}
- Last Payment: ${company.lastPaidSemester || "No payment on record"}

Payment is required to maintain your registration status for the upcoming career fair. Companies with outstanding balances exceeding two semesters may have their registration blocked.

Please remit payment at your earliest convenience or contact us to discuss payment arrangements.

Payment Methods:
- ACH Transfer: Contact us for banking details
- Check: Payable to "TAMU SEC" and mailed to [Address]
- Credit Card: Available through our online portal

If you have already submitted payment, please disregard this notice and accept our thanks.

For questions or to discuss your account, please contact the SEC Finance Team.

Best regards,
TAMU SEC Finance Team
sec-finance@tamu.edu
(979) 555-0100`
}

// Check if a company needs outreach (status has been active > 14 days without assignment)
function needsOutreach(companyName: string): { needs: boolean; registration: typeof rawRegistrations[0] | undefined; daysSinceUpdate: number } {
  const registration = rawRegistrations.find(r => 
    r.organization.toLowerCase().includes(companyName.toLowerCase()) ||
    companyName.toLowerCase().includes(r.organization.toLowerCase())
  )
  
  if (!registration) {
    return { needs: false, registration: undefined, daysSinceUpdate: 0 }
  }
  
  // Check if status requires outreach
  if (!outreachStatuses.includes(registration.status)) {
    return { needs: false, registration, daysSinceUpdate: 0 }
  }
  
  // Check if status is Confirmed or Denied (final statuses)
  if (registration.status === "Confirmed" || registration.status === "Denied") {
    return { needs: false, registration, daysSinceUpdate: 0 }
  }
  
  // Calculate days since last status update
  const lastUpdate = new Date(registration.lastStatusUpdate)
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Needs outreach if > 14 days and no assignment (or any non-final status)
  const needs = daysSinceUpdate > 14
  
  return { needs, registration, daysSinceUpdate }
}

export function FinanceWorkspace() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyFinancials | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailCompany, setEmailCompany] = useState<CompanyFinancials | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [creditCompany, setCreditCompany] = useState<CompanyFinancials | null>(null)
  const [creditAmount, setCreditAmount] = useState(1)
  
  // Local state for balance updates (MVP simulation)
  const [balanceUpdates, setBalanceUpdates] = useState<Record<string, number>>({})

  const companies = useMemo(() => getNormalizedCompanies(), [])
  const totalReceivables = useMemo(() => {
    const baseTotal = getTotalReceivables()
    const credits = Object.values(balanceUpdates).reduce((sum, credit) => sum + credit, 0)
    return baseTotal - credits
  }, [balanceUpdates])
  const highRiskCompanies = useMemo(() => getHighRiskCompanies(), [])

  const overdueTotal = useMemo(() => {
    return companyFinancials.reduce((sum, f) => {
      const overduePayments = f.paymentsHistory.filter(p => p.status === "Overdue")
      return sum + overduePayments.reduce((s, p) => s + p.amount, 0)
    }, 0)
  }, [])

  const filteredFinancials = useMemo(() => {
    if (!searchQuery.trim()) return companyFinancials
    const query = searchQuery.toLowerCase()
    return companyFinancials.filter(f => 
      f.companyName.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Get effective balance (original minus credits)
  function getEffectiveBalance(company: CompanyFinancials): number {
    const credit = balanceUpdates[company.companyName] || 0
    return Math.max(0, company.balanceDue - credit)
  }

  const handleCopyEmail = () => {
    if (emailCompany) {
      navigator.clipboard.writeText(generateReminderEmail(emailCompany))
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleAddCredit = () => {
    if (!creditCompany || creditAmount <= 0) return
    
    setBalanceUpdates(prev => ({
      ...prev,
      [creditCompany.companyName]: (prev[creditCompany.companyName] || 0) + creditAmount
    }))
    
    toast.success(`Added ${formatCurrency(creditAmount)} credit to ${creditCompany.companyName}`)
    setCreditDialogOpen(false)
    setCreditAmount(1)
    setCreditCompany(null)
  }

  const handleOutreachClick = (companyName: string) => {
    const { registration } = needsOutreach(companyName)
    
    if (registration?.assignedTo) {
      const member = getMemberByInitials(registration.assignedTo)
      if (member) {
        console.log(`[v0] Sending SMTP Email to ${member.name} (${member.email})...`)
        toast.info(`Sending SMTP Email to ${member.name}...`, {
          description: `Email: ${member.email}`,
          duration: 3000,
        })
        return
      }
    }
    
    // No assignment - show warning
    console.log(`[v0] Sending SMTP Email to Registration Team for unassigned company: ${companyName}...`)
    toast.warning(`Sending outreach email to Registration Team`, {
      description: `${companyName} has no assigned SEC member`,
      duration: 3000,
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Finance & Debt Recovery</h2>
          <p className="text-sm text-muted-foreground">
            Balance tracking, payment management, credit system, and outreach alerts
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Receivables</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalReceivables)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue Amount</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(overdueTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High-Risk Companies</p>
                  <p className="text-2xl font-bold text-destructive">{highRiskCompanies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid in Full</p>
                  <p className="text-2xl font-bold text-green-600">
                    {companyFinancials.filter(f => getEffectiveBalance(f) === 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High Risk Alert */}
        {highRiskCompanies.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                High-Risk Accounts Requiring Attention
              </CardTitle>
              <CardDescription className="text-destructive/80">
                These companies have balances overdue by 2+ semesters and may require registration blocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {highRiskCompanies.map(company => (
                  <div
                    key={company.companyName}
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-background px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{company.companyName}</span>
                    <Badge variant="destructive">{formatCurrency(getEffectiveBalance(company))}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        setEmailCompany(company)
                        setEmailDialogOpen(true)
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Balance Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Company Balances</CardTitle>
            <CardDescription>
              Track payment status, apply credits, and monitor outreach needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Last Paid</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFinancials.map(financial => {
                  const company = companies.find(c => c.canonicalName === financial.companyName)
                  const effectiveBalance = getEffectiveBalance(financial)
                  const { needs: needsOutreachFlag, daysSinceUpdate } = needsOutreach(financial.companyName)
                  const creditApplied = balanceUpdates[financial.companyName] || 0
                  
                  return (
                    <TableRow key={financial.companyName}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{financial.companyName}</span>
                          {company && (
                            <Badge variant="outline" className="text-xs">
                              {company.package}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={effectiveBalance > 0 ? "font-semibold text-destructive" : "text-green-600"}>
                            {formatCurrency(effectiveBalance)}
                          </span>
                          {creditApplied > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({formatCurrency(creditApplied)} credit applied)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {financial.lastPaidSemester || "Never"}
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(financial.debtRiskFlag)}
                      </TableCell>
                      <TableCell>
                        {needsOutreachFlag && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                onClick={() => handleOutreachClick(financial.companyName)}
                              >
                                <Bell className="h-4 w-4 mr-1" />
                                <span className="text-xs">Needs Outreach</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Status unchanged for {daysSinceUpdate} days</p>
                              <p className="text-xs text-muted-foreground">Click to send outreach email</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCompany(financial)}
                          >
                            <ChevronRight className="h-4 w-4" />
                            Details
                          </Button>
                          {effectiveBalance > 0 && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setCreditCompany(financial)
                                      setCreditDialogOpen(true)
                                    }}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Credit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEmailCompany(financial)
                                      setEmailDialogOpen(true)
                                    }}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Reminder</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment History Sheet */}
        <Sheet open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selectedCompany && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedCompany.companyName}</SheetTitle>
                  <SheetDescription>Payment history and account details</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Account Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={`text-2xl font-bold ${getEffectiveBalance(selectedCompany) > 0 ? "text-destructive" : "text-green-600"}`}>
                        {formatCurrency(getEffectiveBalance(selectedCompany))}
                      </p>
                      {(balanceUpdates[selectedCompany.companyName] || 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {formatCurrency(selectedCompany.balanceDue)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <div className="mt-1">
                        {getRiskBadge(selectedCompany.debtRiskFlag)}
                      </div>
                    </div>
                  </div>

                  {/* Credit Applied */}
                  {(balanceUpdates[selectedCompany.companyName] || 0) > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">Credit Applied</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrency(balanceUpdates[selectedCompany.companyName])}
                      </p>
                    </div>
                  )}

                  {/* Add Credit Button */}
                  {getEffectiveBalance(selectedCompany) > 0 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setCreditCompany(selectedCompany)
                        setCreditDialogOpen(true)
                      }}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Add Credit
                    </Button>
                  )}

                  {/* Payment History */}
                  <div>
                    <h4 className="mb-3 font-medium text-foreground">Payment History</h4>
                    <div className="space-y-3">
                      {selectedCompany.paymentsHistory.map(payment => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            {getPaymentStatusIcon(payment.status)}
                            <div>
                              <p className="font-medium text-foreground">{payment.semester}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.paidDate 
                                  ? `Paid: ${new Date(payment.paidDate).toLocaleDateString()}`
                                  : payment.status === "Overdue" 
                                    ? "Overdue"
                                    : "Pending"
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">{formatCurrency(payment.amount)}</p>
                            <Badge 
                              variant={
                                payment.status === "Paid" 
                                  ? "outline" 
                                  : payment.status === "Overdue" 
                                    ? "destructive" 
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {getEffectiveBalance(selectedCompany) > 0 && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setEmailCompany(selectedCompany)
                        setEmailDialogOpen(true)
                        setSelectedCompany(null)
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Generate Reminder Email
                    </Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Credit Dialog */}
        <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Add Credit
              </DialogTitle>
              <DialogDescription>
                Add credit to {creditCompany?.companyName}. 1 credit = $1.
              </DialogDescription>
            </DialogHeader>

            {creditCompany && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(getEffectiveBalance(creditCompany))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Credit Amount ($)</label>
                  <Input
                    type="number"
                    min={1}
                    max={getEffectiveBalance(creditCompany)}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    New balance after credit: {formatCurrency(Math.max(0, getEffectiveBalance(creditCompany) - creditAmount))}
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCredit}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Apply {formatCurrency(creditAmount)} Credit
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Generator Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Reminder Email</DialogTitle>
              <DialogDescription>
                Generated email for {emailCompany?.companyName}. Copy and send via your email client.
              </DialogDescription>
            </DialogHeader>

            {emailCompany && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <Textarea
                    value={generateReminderEmail(emailCompany)}
                    readOnly
                    className="min-h-[300px] font-mono text-sm bg-background"
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCopyEmail}>
                    {copiedEmail ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
