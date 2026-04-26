"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Pencil } from "lucide-react";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [original, setOriginal] = useState<any>(null);

  const [newSchedule, setNewSchedule] = useState({
    route_id: "",
    departure_time: "",
  });

  // ================= FETCH =================
  const fetchSchedules = async () => {
    // SR3: Safe query
    const { data, error } = await supabase
      .from("schedules")
      .select("*, routes(*, operators(name)), buses(bus_name, operators(name))")
      .order("created_at", { ascending: false });

    // SR4
    if (error) {
      alert("Failed to fetch schedules");
      return;
    }

    setSchedules(data || []);
  };

  const fetchRoutes = async () => {
    const { data } = await supabase.from("routes").select("*");
    setRoutes(data || []);
  };

  const fetchBuses = async () => {
    const { data } = await supabase.from("buses").select("*");
    setBuses(data || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        // SR1: Session validation
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.warn("No session");
          window.location.href = "/admin-login";
          return;
        }

        const userId = session.user.id;

        // SR2: Role-based access control (RBAC)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profileError || !profile || profile.role !== "admin") {
          console.warn("Unauthorized access");

          // SR3: Force logout
          await supabase.auth.signOut();
          window.location.href = "/admin-login";
          return;
        }

        // SR4: Only fetch AFTER security passes
        await fetchSchedules();
        await fetchRoutes();
        await fetchBuses();
      } catch (err) {
        console.error("Security check failed:", err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  // ================= HELPER =================
  const calculateArrival = (departure: string, duration: string) => {
    const dep = new Date(departure);

    const [hPart, mPart] = duration.split("h");
    const hours = parseInt(hPart.trim());
    const minutes = parseInt(mPart.replace("m", "").trim());

    dep.setHours(dep.getHours() + hours);
    dep.setMinutes(dep.getMinutes() + minutes);

    const year = dep.getFullYear();
    const month = String(dep.getMonth() + 1).padStart(2, "0");
    const day = String(dep.getDate()).padStart(2, "0");
    const hoursStr = String(dep.getHours()).padStart(2, "0");
    const minutesStr = String(dep.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
  };

  // ================= ADD =================
  const handleAdd = async () => {
    const { route_id, departure_time } = newSchedule;

    // SR2
    if (!route_id || !departure_time) {
      return alert("All fields required");
    }

    const route = routes.find((r) => r.id === route_id);

    if (!route) return alert("Route not found");

    // 🔥 AUTO PICK BUS
    const bus = buses.find((b) => b.operator_id === route.operator_id);

    if (!bus) {
      return alert("No bus available for this operator");
    }

    // SR2 (frequency control)
    const today = departure_time.split("T")[0];

    const { data: existing } = await supabase
      .from("schedules")
      .select("*")
      .eq("route_id", route_id)
      .gte("departure_time", `${today}T00:00:00`)
      .lte("departure_time", `${today}T23:59:59`);

    if (existing && existing.length >= route.frequency) {
      return alert("Exceeds daily trip limit");
    }

    const arrival_time = calculateArrival(departure_time, route.duration);

    const { error } = await supabase.from("schedules").insert([
      {
        route_id,
        departure_time,
        arrival_time,
        available_seats: bus.total_seats, // 🔥 AUTO
        bus_id: bus.id, // 🔥 NEW
      },
    ]);

    // SR4
    if (error) {
      alert("Failed to add schedule");
      return;
    }

    fetchSchedules();
    setIsAddOpen(false);
  };

  // ================= DELETE =================
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id);

    if (error) {
      alert("Failed to delete");
      return;
    }

    fetchSchedules();
  };

  // ================= UPDATE =================
  const handleUpdate = async () => {
    if (new Date(selected.departure_time) < new Date()) {
      return alert("Cannot set past schedule");
    }
    const route = routes.find((r) => r.id === selected?.route_id);

    if (!route) {
      alert("Route not found");
      return;
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // SR2
    if (selected.departure_time !== original.departure_time) {
      const formatted =
        selected.departure_time.length === 16
          ? selected.departure_time + ":00"
          : selected.departure_time;

      updates.departure_time = formatted;
      updates.arrival_time = calculateArrival(formatted, route.duration);
    }

    const bus = buses.find((b) => b.operator_id === route.operator_id);

    if (!bus) {
      alert("No bus found for this operator");
      return;
    }

    if (selected.bus_id !== bus.id) {
      updates.bus_id = bus.id;
    }

    // ✅ prevent empty update
    const isOnlyTimestamp =
      Object.keys(updates).length === 1 && updates.updated_at;

    if (isOnlyTimestamp) {
      alert("No changes detected");
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .update(updates)
      .eq("id", selected.id);

    if (error) {
      alert("Update failed");
      return;
    }

    fetchSchedules();
    setIsEditOpen(false);
  };

  const getLocalDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Schedules</h1>
        <Button onClick={() => setIsAddOpen(true)}>Add Schedule</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Schedules</CardTitle>
            <div className="w-80">
              <Input
                placeholder="Search schedules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {schedules
                .filter((s) =>
                  s.routes?.route_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.routes?.route_name}</TableCell>
                    <TableCell>
                      {s.buses
                        ? `${s.buses.bus_name} (${s.buses.operators?.name})`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(s.departure_time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(s.arrival_time).toLocaleString()}
                    </TableCell>
                    <TableCell>{s.available_seats}</TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelected(s);
                            setOriginal(s);
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Select
              onValueChange={(v) =>
                setNewSchedule({ ...newSchedule, route_id: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.route_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)} // SR1: Prevent past date selection
              onChange={(e) =>
                setNewSchedule({
                  ...newSchedule,
                  departure_time: e.target.value,
                })
              }
            />
          </div>

          <DialogFooter>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <Input
                type="datetime-local"
                min={
                  selected?.departure_time &&
                  new Date(selected.departure_time) < new Date()
                    ? undefined // SR2: Allow display of old past data
                    : getLocalDateTime()
                }
                value={
                  selected.departure_time
                    ? selected.departure_time.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setSelected({ ...selected, departure_time: e.target.value })
                }
              />
              ;
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
