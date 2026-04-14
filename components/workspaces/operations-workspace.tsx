"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  cancellationRecords,
  chatMessages,
  companyScores,
  getNormalizedCompanies,
  getCompanyChat,
  getCompanyScore,
  type CancellationRecord,
  type ChatMessage,
  type CompanyScore,
} from "@/lib/data"
import {
  AlertTriangle,
  XCircle,
  MessageSquare,
  Star,
  Send,
  Plus,
  Building2,
  Clock,
  User,
  CheckCircle2,
  TrendingUp,
  Award,
} from "lucide-react"

function getUrgencyBadge(urgency: CancellationRecord["urgencyLevel"]) {
  switch (urgency) {
    case "High":
      return <Badge variant="destructive">High Urgency</Badge>
    case "Medium":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Medium</Badge>
    case "Low":
      return <Badge variant="secondary">Low</Badge>
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600"
  if (score >= 75) return "text-primary"
  if (score >= 60) return "text-amber-600"
  return "text-destructive"
}

function getScoreBadge(score: number) {
  if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
  if (score >= 75) return <Badge className="bg-primary/10 text-primary">Good</Badge>
  if (score >= 60) return <Badge className="bg-amber-100 text-amber-800">Fair</Badge>
  return <Badge variant="destructive">Needs Improvement</Badge>
}

export function OperationsWorkspace() {
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false)
  const [scoringDialogOpen, setScoringDialogOpen] = useState(false)
  const [selectedChatCompany, setSelectedChatCompany] = useState<string>("")
  const [newMessage, setNewMessage] = useState("")
  const [localCancellations, setLocalCancellations] = useState(cancellationRecords)
  const [localChatMessages, setLocalChatMessages] = useState(chatMessages)
  const [localScores, setLocalScores] = useState(companyScores)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [newCancellation, setNewCancellation] = useState({
    companyName: "",
    reason: "",
    urgencyLevel: "Medium" as CancellationRecord["urgencyLevel"],
  })

  const [newScore, setNewScore] = useState({
    companyName: "",
    engagement: 20,
    professionalism: 20,
    recruitmentQuality: 20,
    studentFeedback: 20,
  })

  const companies = useMemo(() => getNormalizedCompanies(), [])

  const currentChatMessages = useMemo(() => {
    if (!selectedChatCompany) return []
    return localChatMessages.filter(m => m.companyName === selectedChatCompany)
  }, [selectedChatCompany, localChatMessages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentChatMessages])

  const handleSubmitCancellation = () => {
    if (!newCancellation.companyName || !newCancellation.reason) return

    const cancellation: CancellationRecord = {
      id: `c-${Date.now()}`,
      companyName: newCancellation.companyName,
      cancellationDate: new Date().toISOString().split("T")[0],
      reason: newCancellation.reason,
      urgencyLevel: newCancellation.urgencyLevel,
      boothStatus: "Vacant",
      handledBy: "Current User",
    }

    setLocalCancellations([...localCancellations, cancellation])
    setCancellationDialogOpen(false)
    setNewCancellation({
      companyName: "",
      reason: "",
      urgencyLevel: "Medium",
    })
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatCompany) return

    const message: ChatMessage = {
      id: `ch-${Date.now()}`,
      companyName: selectedChatCompany,
      author: "You",
      timestamp: new Date().toISOString(),
      message: newMessage.trim(),
    }

    setLocalChatMessages([...localChatMessages, message])
    setNewMessage("")
  }

  const handleSubmitScore = () => {
    if (!newScore.companyName) return

    const totalScore = newScore.engagement + newScore.professionalism + 
                       newScore.recruitmentQuality + newScore.studentFeedback

    const score: CompanyScore = {
      companyName: newScore.companyName,
      engagement: newScore.engagement,
      professionalism: newScore.professionalism,
      recruitmentQuality: newScore.recruitmentQuality,
      studentFeedback: newScore.studentFeedback,
      totalScore,
      evaluatedBy: "Current User",
      evaluatedDate: new Date().toISOString().split("T")[0],
    }

    // Update or add score
    const existingIndex = localScores.findIndex(s => s.companyName === newScore.companyName)
    if (existingIndex >= 0) {
      const updated = [...localScores]
      updated[existingIndex] = score
      setLocalScores(updated)
    } else {
      setLocalScores([...localScores, score])
    }

    setScoringDialogOpen(false)
    setNewScore({
      companyName: "",
      engagement: 20,
      professionalism: 20,
      recruitmentQuality: 20,
      studentFeedback: 20,
    })
  }

  const getExistingScore = (companyName: string) => {
    return localScores.find(s => s.companyName === companyName)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Operations & Support</h2>
          <p className="text-sm text-muted-foreground">
            Cancellation management, internal chat, and company scoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScoringDialogOpen(true)}>
            <Star className="mr-2 h-4 w-4" />
            Score Company
          </Button>
          <Button variant="destructive" onClick={() => setCancellationDialogOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Process Cancellation
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancellations</p>
                <p className="text-2xl font-bold text-foreground">{localCancellations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vacant Booths</p>
                <p className="text-2xl font-bold text-foreground">
                  {localCancellations.filter(c => c.boothStatus === "Vacant").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Companies Scored</p>
                <p className="text-2xl font-bold text-foreground">{localScores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {localScores.length > 0
                    ? Math.round(localScores.reduce((s, c) => s + c.totalScore, 0) / localScores.length)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Cancellations & Scores */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="cancellations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
              <TabsTrigger value="scores">Company Scores</TabsTrigger>
            </TabsList>

            {/* Cancellations Tab */}
            <TabsContent value="cancellations">
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation Log</CardTitle>
                  <CardDescription>
                    Track company cancellations and booth availability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {localCancellations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Booth</TableHead>
                          <TableHead>Handled By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {localCancellations.map(cancellation => (
                          <TableRow key={cancellation.id}>
                            <TableCell>
                              <span className="font-medium text-foreground">
                                {cancellation.companyName}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(cancellation.cancellationDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {cancellation.reason}
                            </TableCell>
                            <TableCell>
                              {getUrgencyBadge(cancellation.urgencyLevel)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={cancellation.boothStatus === "Vacant" ? "destructive" : "outline"}
                              >
                                {cancellation.boothStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {cancellation.handledBy}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium text-foreground">No Cancellations</p>
                      <p className="text-sm text-muted-foreground">
                        All companies are confirmed for the career fair
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scores Tab */}
            <TabsContent value="scores">
              <Card>
                <CardHeader>
                  <CardTitle>Company Evaluation Scores</CardTitle>
                  <CardDescription>
                    0-100 rubric scores based on engagement, professionalism, recruitment quality, and student feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-center">Engagement</TableHead>
                        <TableHead className="text-center">Professional</TableHead>
                        <TableHead className="text-center">Quality</TableHead>
                        <TableHead className="text-center">Feedback</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localScores
                        .sort((a, b) => b.totalScore - a.totalScore)
                        .map(score => (
                          <TableRow key={score.companyName}>
                            <TableCell>
                              <span className="font-medium text-foreground">
                                {score.companyName}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{score.engagement}/25</TableCell>
                            <TableCell className="text-center">{score.professionalism}/25</TableCell>
                            <TableCell className="text-center">{score.recruitmentQuality}/25</TableCell>
                            <TableCell className="text-center">{score.studentFeedback}/25</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${getScoreColor(score.totalScore)}`}>
                                {score.totalScore}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getScoreBadge(score.totalScore)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Internal Chat */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Internal Chat
              </CardTitle>
              <CardDescription>
                Discuss specific companies with your team
              </CardDescription>
              <Select
                value={selectedChatCompany}
                onValueChange={setSelectedChatCompany}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.canonicalName} value={company.canonicalName}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {company.canonicalName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {selectedChatCompany ? (
                <>
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {currentChatMessages.length > 0 ? (
                        currentChatMessages.map(msg => (
                          <div key={msg.id} className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground text-sm">
                                  {msg.author}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(msg.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{msg.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 pt-4 border-t mt-4">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Select a company to view or start a discussion
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Process Cancellation
            </DialogTitle>
            <DialogDescription>
              Record a company cancellation and mark their booth as vacant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={newCancellation.companyName}
                onValueChange={(value) => 
                  setNewCancellation(prev => ({ ...prev, companyName: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter(c => c.status !== "Cancelled")
                    .map(company => (
                      <SelectItem key={company.canonicalName} value={company.canonicalName}>
                        {company.canonicalName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select
                value={newCancellation.urgencyLevel}
                onValueChange={(value: CancellationRecord["urgencyLevel"]) => 
                  setNewCancellation(prev => ({ ...prev, urgencyLevel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low - Planned ahead</SelectItem>
                  <SelectItem value="Medium">Medium - Short notice</SelectItem>
                  <SelectItem value="High">High - Last minute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Textarea
                value={newCancellation.reason}
                onChange={(e) => 
                  setNewCancellation(prev => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Budget constraints, scheduling conflicts, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellationDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitCancellation}>
              Process Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={scoringDialogOpen} onOpenChange={setScoringDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Company Scoring Rubric
            </DialogTitle>
            <DialogDescription>
              Evaluate a company on four criteria (each 0-25 points)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={newScore.companyName}
                onValueChange={(value) => {
                  const existing = getExistingScore(value)
                  if (existing) {
                    setNewScore({
                      companyName: value,
                      engagement: existing.engagement,
                      professionalism: existing.professionalism,
                      recruitmentQuality: existing.recruitmentQuality,
                      studentFeedback: existing.studentFeedback,
                    })
                  } else {
                    setNewScore(prev => ({ ...prev, companyName: value }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.canonicalName} value={company.canonicalName}>
                      {company.canonicalName}
                      {getExistingScore(company.canonicalName) && (
                        <span className="ml-2 text-muted-foreground">
                          (Score: {getExistingScore(company.canonicalName)?.totalScore})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Engagement</Label>
                  <span className="text-sm font-medium">{newScore.engagement}/25</span>
                </div>
                <Slider
                  value={[newScore.engagement]}
                  onValueChange={([value]) => 
                    setNewScore(prev => ({ ...prev, engagement: value }))
                  }
                  max={25}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Professionalism</Label>
                  <span className="text-sm font-medium">{newScore.professionalism}/25</span>
                </div>
                <Slider
                  value={[newScore.professionalism]}
                  onValueChange={([value]) => 
                    setNewScore(prev => ({ ...prev, professionalism: value }))
                  }
                  max={25}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Recruitment Quality</Label>
                  <span className="text-sm font-medium">{newScore.recruitmentQuality}/25</span>
                </div>
                <Slider
                  value={[newScore.recruitmentQuality]}
                  onValueChange={([value]) => 
                    setNewScore(prev => ({ ...prev, recruitmentQuality: value }))
                  }
                  max={25}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Student Feedback</Label>
                  <span className="text-sm font-medium">{newScore.studentFeedback}/25</span>
                </div>
                <Slider
                  value={[newScore.studentFeedback]}
                  onValueChange={([value]) => 
                    setNewScore(prev => ({ ...prev, studentFeedback: value }))
                  }
                  max={25}
                  step={1}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Total Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(
                  newScore.engagement + newScore.professionalism + 
                  newScore.recruitmentQuality + newScore.studentFeedback
                )}`}>
                  {newScore.engagement + newScore.professionalism + 
                   newScore.recruitmentQuality + newScore.studentFeedback}/100
                </span>
              </div>
              <div className="mt-2">
                {getScoreBadge(
                  newScore.engagement + newScore.professionalism + 
                  newScore.recruitmentQuality + newScore.studentFeedback
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScoringDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitScore}>
              <Award className="mr-2 h-4 w-4" />
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
