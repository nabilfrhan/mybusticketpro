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

export default function BusesPage() {
  const [buses, setBuses] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [newBus, setNewBus] = useState({
    operator_id: "",
    bus_name: "",
    total_seats: "",
  });

  // ================= FETCH =================
  const fetchBuses = async () => {
    // SR3: SAFE query (NO JOIN → avoids permission issues)
    const { data: busData, error: busError } = await supabase
      .from("buses")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: scheduleData, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, bus_id, available_seats");

    const { data: operatorData, error: operatorError } = await supabase
      .from("operators")
      .select("*");

    // SR4: Proper error handling
    if (busError) {
      console.error("Fetch buses error:", busError);
      alert(busError.message);
      return;
    }

    if (scheduleError) {
      console.error("Fetch schedules error:", scheduleError);
      alert(scheduleError.message);
      return;
    }

    if (operatorError) {
      console.error("Fetch operators error:", operatorError);
      alert(operatorError.message);
      return;
    }

    // 🔥 MANUAL MERGE (replace JOIN)
    const merged = (busData || []).map((b) => {
      const schedule = scheduleData?.find((s) => s.bus_id === b.id);

      return {
        ...b,
        operators: operatorData?.find((op) => op.id === b.operator_id) || null,

        // SR6: Use available seats instead of total seats
        available_seats: schedule?.available_seats ?? b.total_seats,
      };
    });

    setBuses(merged);
    setOperators(operatorData || []);
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
        await fetchBuses();
      } catch (err) {
        console.error("Security check failed:", err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  // ================= ADD =================
  const handleAdd = async () => {
    const { operator_id, bus_name, total_seats } = newBus;

    // SR2: Input validation
    if (!operator_id || !bus_name || !total_seats) {
      return alert("All fields required");
    }

    // SR5: Constraints
    if (bus_name.length > 100) return alert("Invalid bus name");
    if (isNaN(Number(total_seats))) return alert("Seats must be number");
    if (Number(total_seats) > 100) return alert("Seats too large");

    const { error } = await supabase.from("buses").insert([
      {
        operator_id,
        bus_name,
        total_seats: Number(total_seats),
      },
    ]);

    if (error) {
      console.error("Add error:", error);
      alert(error.message);
      return;
    }

    fetchBuses();
    setIsAddOpen(false);
    setNewBus({ operator_id: "", bus_name: "", total_seats: "" });
  };

  // ================= DELETE =================
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("buses").delete().eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      alert(error.message);
      return;
    }

    fetchBuses();
  };

  // ================= UPDATE =================
  const handleUpdate = async () => {
    if (!selected.bus_name) return alert("Bus name required");
    if (isNaN(Number(selected.total_seats))) return alert("Invalid seats");

    const { error } = await supabase
      .from("buses")
      .update({
        operator_id: selected.operator_id,
        bus_name: selected.bus_name,
        total_seats: Number(selected.total_seats),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      console.error("Update error:", error);
      alert(error.message);
      return;
    }

    fetchBuses();
    setIsEditOpen(false);
  };

  // ================= FILTER =================
  const filtered = buses.filter((b) =>
    b.bus_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Buses</h1>
        <Button onClick={() => setIsAddOpen(true)}>Add Bus</Button>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Buses</CardTitle>
            <div className="w-80">
              <Input
                placeholder="Search buses..."
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
                <TableHead>Bus</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.bus_name}</TableCell>
                  <TableCell>{b.operators?.name || "-"}</TableCell>
                  <TableCell>{b.available_seats}</TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelected(b);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(b.id)}
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
            <DialogTitle>Add Bus</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Select
              onValueChange={(v) => setNewBus({ ...newBus, operator_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Bus Name"
              onChange={(e) =>
                setNewBus({ ...newBus, bus_name: e.target.value })
              }
            />

            <Input
              placeholder="Total Seats"
              onChange={(e) =>
                setNewBus({ ...newBus, total_seats: e.target.value })
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
            <DialogTitle>Edit Bus</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <Select
                value={selected.operator_id}
                onValueChange={(v) =>
                  setSelected({ ...selected, operator_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={selected.bus_name}
                onChange={(e) =>
                  setSelected({ ...selected, bus_name: e.target.value })
                }
              />

              <Input
                value={selected.total_seats}
                onChange={(e) =>
                  setSelected({ ...selected, total_seats: e.target.value })
                }
              />
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
