"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Bus, Users, Clock, MapPin, CheckCircle, XCircle, Download, Printer } from "lucide-react"

interface Passenger {
  id: string
  bookingId: string
  name: string
  email: string
  phone: string
  seat: string
  boardingStatus: "Boarded" | "Not Boarded" | "No Show"
  ticketType: "Regular" | "Premium"
}

const trips = [
  { id: "T001", route: "New York to Boston", departure: "06:00 AM", bus: "GE-1234", operator: "Greyhound Express" },
  { id: "T002", route: "New York to Boston", departure: "08:30 AM", bus: "FB-5678", operator: "FlixBus" },
  { id: "T003", route: "New York to Boston", departure: "10:00 AM", bus: "MB-9012", operator: "MegaBus" },
  { id: "T004", route: "New York to Boston", departure: "12:30 PM", bus: "BB-3456", operator: "BoltBus" },
]

const mockPassengers: Passenger[] = [
  { id: "1", bookingId: "MBT001", name: "John Doe", email: "john@example.com", phone: "+1 555-0101", seat: "1A", boardingStatus: "Boarded", ticketType: "Premium" },
  { id: "2", bookingId: "MBT002", name: "Jane Smith", email: "jane@example.com", phone: "+1 555-0102", seat: "1B", boardingStatus: "Boarded", ticketType: "Premium" },
  { id: "3", bookingId: "MBT003", name: "Mike Johnson", email: "mike@example.com", phone: "+1 555-0103", seat: "2A", boardingStatus: "Boarded", ticketType: "Premium" },
  { id: "4", bookingId: "MBT004", name: "Sarah Wilson", email: "sarah@example.com", phone: "+1 555-0104", seat: "2B", boardingStatus: "Not Boarded", ticketType: "Premium" },
  { id: "5", bookingId: "MBT005", name: "Tom Brown", email: "tom@example.com", phone: "+1 555-0105", seat: "3A", boardingStatus: "Not Boarded", ticketType: "Premium" },
  { id: "6", bookingId: "MBT006", name: "Emily Davis", email: "emily@example.com", phone: "+1 555-0106", seat: "4A", boardingStatus: "Boarded", ticketType: "Regular" },
  { id: "7", bookingId: "MBT007", name: "Chris Lee", email: "chris@example.com", phone: "+1 555-0107", seat: "4B", boardingStatus: "Boarded", ticketType: "Regular" },
  { id: "8", bookingId: "MBT008", name: "Amy Taylor", email: "amy@example.com", phone: "+1 555-0108", seat: "5A", boardingStatus: "Not Boarded", ticketType: "Regular" },
  { id: "9", bookingId: "MBT009", name: "David Miller", email: "david@example.com", phone: "+1 555-0109", seat: "5B", boardingStatus: "No Show", ticketType: "Regular" },
  { id: "10", bookingId: "MBT010", name: "Lisa Anderson", email: "lisa@example.com", phone: "+1 555-0110", seat: "6A", boardingStatus: "Boarded", ticketType: "Regular" },
]

function ManifestContent() {
  const searchParams = useSearchParams()
  const initialTrip = searchParams.get("trip") || "T002"
  
  const [selectedTrip, setSelectedTrip] = useState(initialTrip)
  const [searchTerm, setSearchTerm] = useState("")
  const [passengers, setPassengers] = useState<Passenger[]>(mockPassengers)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const currentTrip = trips.find((t) => t.id === selectedTrip)

  const filteredPassengers = passengers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.seat.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.boardingStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleBoardingStatusChange = (passengerId: string, status: "Boarded" | "Not Boarded" | "No Show") => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === passengerId ? { ...p, boardingStatus: status } : p))
    )
  }

  const boardedCount = passengers.filter((p) => p.boardingStatus === "Boarded").length
  const totalPassengers = passengers.length

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Passenger Manifest</h1>
          <p className="text-muted-foreground">Manage passenger boarding and check-in</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Trip Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => setSelectedTrip(trip.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedTrip === trip.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-primary" />
                  <span className="font-medium">{trip.bus}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{trip.route}</p>
                <p className="text-sm text-muted-foreground">{trip.departure}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trip Info & Stats */}
      {currentTrip && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bus Number</p>
                <p className="text-xl font-bold">{currentTrip.bus}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="text-lg font-bold">{currentTrip.route}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departure</p>
                <p className="text-xl font-bold">{currentTrip.departure}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boarded</p>
                <p className="text-xl font-bold">
                  {boardedCount}/{totalPassengers}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Passenger List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Passenger List</CardTitle>
              <CardDescription>
                {filteredPassengers.length} passengers
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search passengers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Boarded">Boarded</SelectItem>
                  <SelectItem value="Not Boarded">Not Boarded</SelectItem>
                  <SelectItem value="No Show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seat</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPassengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {passenger.seat}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{passenger.name}</TableCell>
                  <TableCell className="font-mono text-sm">{passenger.bookingId}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{passenger.email}</p>
                      <p className="text-muted-foreground">{passenger.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={passenger.ticketType === "Premium" ? "default" : "secondary"}>
                      {passenger.ticketType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        passenger.boardingStatus === "Boarded"
                          ? "default"
                          : passenger.boardingStatus === "No Show"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {passenger.boardingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {passenger.boardingStatus !== "Boarded" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600"
                          onClick={() => handleBoardingStatusChange(passenger.id, "Boarded")}
                          title="Mark as Boarded"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {passenger.boardingStatus === "Not Boarded" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleBoardingStatusChange(passenger.id, "No Show")}
                          title="Mark as No Show"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PassengerManifestPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Loading manifest...</p>
        </div>
      </div>
    }>
      <ManifestContent />
    </Suspense>
  )
}
