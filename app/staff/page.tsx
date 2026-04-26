import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bus, Users, Clock, MapPin, ArrowRight, Calendar } from "lucide-react"

const todayTrips = [
  {
    id: "T001",
    route: "New York to Boston",
    departure: "06:00 AM",
    arrival: "10:30 AM",
    bus: "GE-1234",
    operator: "Greyhound Express",
    passengers: 38,
    capacity: 45,
    status: "Departed",
  },
  {
    id: "T002",
    route: "New York to Boston",
    departure: "08:30 AM",
    arrival: "01:15 PM",
    bus: "FB-5678",
    operator: "FlixBus",
    passengers: 42,
    capacity: 50,
    status: "Boarding",
  },
  {
    id: "T003",
    route: "New York to Boston",
    departure: "10:00 AM",
    arrival: "02:45 PM",
    bus: "MB-9012",
    operator: "MegaBus",
    passengers: 35,
    capacity: 48,
    status: "Scheduled",
  },
  {
    id: "T004",
    route: "New York to Boston",
    departure: "12:30 PM",
    arrival: "05:00 PM",
    bus: "BB-3456",
    operator: "BoltBus",
    passengers: 28,
    capacity: 45,
    status: "Scheduled",
  },
]

const stats = [
  { title: "Today&apos;s Trips", value: "24", icon: Bus },
  { title: "Total Passengers", value: "856", icon: Users },
  { title: "On-Time Rate", value: "94%", icon: Clock },
]

export default function StaffDashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Dashboard</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {today}
          </p>
        </div>
        <Link href="/staff/manifest">
          <Button>
            View Passenger Manifest
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title.replace("&apos;", "'")}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Trips</CardTitle>
          <CardDescription>Manage departures and check passenger lists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayTrips.map((trip) => (
              <div
                key={trip.id}
                className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Bus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{trip.route}</p>
                      <Badge
                        variant={
                          trip.status === "Departed"
                            ? "secondary"
                            : trip.status === "Boarding"
                            ? "default"
                            : "outline"
                        }
                      >
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {trip.departure} - {trip.arrival}
                      </span>
                      <span>Bus: {trip.bus}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{trip.operator}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {trip.passengers}/{trip.capacity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Passengers</p>
                  </div>
                  <Link href={`/staff/manifest?trip=${trip.id}`}>
                    <Button variant="outline" size="sm">
                      View Manifest
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
