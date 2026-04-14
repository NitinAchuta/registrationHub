"use client"

import { useState, useMemo } from "react"
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
import {
  secMembers,
  mealAssignments,
  eventLogistics,
  getNormalizedCompanies,
  getMemberById,
  getMemberMeals,
  type SECMember,
  type MealAssignment,
  type EventLogistics,
} from "@/lib/data"
import {
  Calendar,
  MapPin,
  Users,
  Utensils,
  Plus,
  User,
  AlertCircle,
  PartyPopper,
  UtensilsCrossed,
  MessagesSquare,
  Building2,
} from "lucide-react"

function getMealPreferenceBadge(preference: SECMember["mealPreference"]) {
  switch (preference) {
    case "Vegetarian":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Vegetarian</Badge>
    case "Vegan":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Vegan</Badge>
    case "Halal":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Halal</Badge>
    case "Kosher":
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Kosher</Badge>
    case "None":
      return <Badge variant="outline">No Preference</Badge>
  }
}

function getEventTypeBadge(type: EventLogistics["eventType"]) {
  switch (type) {
    case "Welcome Social":
      return <Badge className="bg-primary/10 text-primary"><PartyPopper className="mr-1 h-3 w-3" />Welcome Social</Badge>
    case "Post-Fair Dinner":
      return <Badge className="bg-amber-100 text-amber-800"><UtensilsCrossed className="mr-1 h-3 w-3" />Dinner</Badge>
    case "Interview Session":
      return <Badge className="bg-blue-100 text-blue-800"><MessagesSquare className="mr-1 h-3 w-3" />Interview</Badge>
    case "Networking Event":
      return <Badge className="bg-green-100 text-green-800"><Users className="mr-1 h-3 w-3" />Networking</Badge>
  }
}

export function HospitalityWorkspace() {
  const [selectedMember, setSelectedMember] = useState<SECMember | null>(null)
  const [assignMealOpen, setAssignMealOpen] = useState(false)
  const [newMeal, setNewMeal] = useState({
    memberId: "",
    eventName: "",
    eventDate: "",
    companyHost: "",
    mealType: "Dinner" as MealAssignment["mealType"],
    specialRequests: "",
  })
  const [localMealAssignments, setLocalMealAssignments] = useState(mealAssignments)

  const companies = useMemo(() => getNormalizedCompanies(), [])

  const handleAssignMeal = () => {
    if (!newMeal.memberId || !newMeal.eventName || !newMeal.eventDate || !newMeal.companyHost) {
      return
    }

    const newAssignment: MealAssignment = {
      id: `ma-${Date.now()}`,
      ...newMeal,
    }

    setLocalMealAssignments([...localMealAssignments, newAssignment])
    setAssignMealOpen(false)
    setNewMeal({
      memberId: "",
      eventName: "",
      eventDate: "",
      companyHost: "",
      mealType: "Dinner",
      specialRequests: "",
    })
  }

  const getMemberMealsLocal = (memberId: string) => {
    return localMealAssignments.filter(m => m.memberId === memberId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Hospitality & Events</h2>
          <p className="text-sm text-muted-foreground">
            SEC member coordination, meal tracking, and event logistics
          </p>
        </div>
        <Button onClick={() => setAssignMealOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Meal
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SEC Members</p>
                <p className="text-2xl font-bold text-foreground">{secMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meals Assigned</p>
                <p className="text-2xl font-bold text-foreground">{localMealAssignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold text-foreground">{eventLogistics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dietary Restrictions</p>
                <p className="text-2xl font-bold text-foreground">
                  {secMembers.filter(m => m.dietaryRestrictions.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">SEC Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="meals">Meal Tracker</TabsTrigger>
        </TabsList>

        {/* SEC Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEC Team Members</CardTitle>
              <CardDescription>
                Team roster with dietary preferences and meal assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {secMembers.map(member => {
                  const memberMeals = getMemberMealsLocal(member.id)
                  return (
                    <div
                      key={member.id}
                      className="cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        {memberMeals.length > 0 && (
                          <Badge variant="secondary">{memberMeals.length} meals</Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {getMealPreferenceBadge(member.mealPreference)}
                        </div>
                        {member.dietaryRestrictions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {member.dietaryRestrictions.map(restriction => (
                              <Badge key={restriction} variant="outline" className="text-xs">
                                {restriction}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Logistics</CardTitle>
              <CardDescription>
                Upcoming events, RSVPs, and venue information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>RSVPs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventLogistics.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{event.eventName}</span>
                      </TableCell>
                      <TableCell>
                        {getEventTypeBadge(event.eventType)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {event.hostCompany}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={event.rsvpCount >= event.maxCapacity ? "text-destructive font-medium" : ""}>
                            {event.rsvpCount}
                          </span>
                          <span className="text-muted-foreground">/ {event.maxCapacity}</span>
                          {event.rsvpCount >= event.maxCapacity && (
                            <Badge variant="destructive" className="text-xs">Full</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Event Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {eventLogistics.map(event => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{event.eventName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    {getEventTypeBadge(event.eventType)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Hosted by <strong>{event.hostCompany}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{event.rsvpCount} / {event.maxCapacity} RSVPs</span>
                    {event.rsvpCount >= event.maxCapacity * 0.9 && (
                      <Badge variant="secondary" className="text-xs">
                        {event.rsvpCount >= event.maxCapacity ? "Full" : "Almost Full"}
                      </Badge>
                    )}
                  </div>
                  {event.specialNotes && (
                    <p className="text-sm text-muted-foreground border-t pt-3">
                      {event.specialNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Meal Tracker Tab */}
        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meal Assignments</CardTitle>
              <CardDescription>
                Track meal assignments for SEC members across events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company Host</TableHead>
                    <TableHead>Meal Type</TableHead>
                    <TableHead>Special Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localMealAssignments.map(meal => {
                    const member = getMemberById(meal.memberId)
                    return (
                      <TableRow key={meal.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">
                              {member?.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{meal.eventName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(meal.eventDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{meal.companyHost}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{meal.mealType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {meal.specialRequests || "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  {selectedMember.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedMember.role} | {selectedMember.email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium text-foreground">Dietary Information</h4>
                  <div className="flex flex-wrap gap-2">
                    {getMealPreferenceBadge(selectedMember.mealPreference)}
                    {selectedMember.dietaryRestrictions.map(r => (
                      <Badge key={r} variant="outline">{r}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium text-foreground">Assigned Meals</h4>
                  {getMemberMealsLocal(selectedMember.id).length > 0 ? (
                    <div className="space-y-2">
                      {getMemberMealsLocal(selectedMember.id).map(meal => (
                        <div key={meal.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{meal.eventName}</span>
                            <Badge variant="outline">{meal.mealType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {meal.companyHost} | {new Date(meal.eventDate).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No meals assigned yet.</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setNewMeal(prev => ({ ...prev, memberId: selectedMember.id }))
                    setSelectedMember(null)
                    setAssignMealOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Meal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Meal Dialog */}
      <Dialog open={assignMealOpen} onOpenChange={setAssignMealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Meal</DialogTitle>
            <DialogDescription>
              Assign a meal to an SEC member for an upcoming event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>SEC Member</Label>
              <Select
                value={newMeal.memberId}
                onValueChange={(value) => setNewMeal(prev => ({ ...prev, memberId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {secMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={newMeal.eventName}
                onChange={(e) => setNewMeal(prev => ({ ...prev, eventName: e.target.value }))}
                placeholder="e.g., Chevron VIP Dinner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={newMeal.eventDate}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, eventDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select
                  value={newMeal.mealType}
                  onValueChange={(value: MealAssignment["mealType"]) => 
                    setNewMeal(prev => ({ ...prev, mealType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Host</Label>
              <Select
                value={newMeal.companyHost}
                onValueChange={(value) => setNewMeal(prev => ({ ...prev, companyHost: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.canonicalName} value={company.canonicalName}>
                      {company.canonicalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Textarea
                value={newMeal.specialRequests}
                onChange={(e) => setNewMeal(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Any dietary accommodations or special requests..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignMealOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignMeal}>
              Assign Meal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
