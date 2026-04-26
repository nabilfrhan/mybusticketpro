"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Route, MapPin } from "lucide-react";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const cities = [
    "Kuala Lumpur, Malaysia",
    "Kuantan, Pahang, Malaysia",
    "Johor Bahru, Malaysia",
    "Ipoh, Perak, Malaysia",
    "Penang, Malaysia",
    "Melaka, Malaysia",
  ];

  const [newRoute, setNewRoute] = useState({
    from: "",
    to: "",
    operator_id: "",
    distance: "",
    duration: "",
    price: "",
    frequency: "",
  });

  // ✅ FETCH ROUTES
  const fetchRoutes = async () => {
    // SR3: SQL Injection Protection (Supabase handles parameterized queries)
    const { data, error } = await supabase
      .from("routes")
      .select("*, operators(name)")
      .order("created_at", { ascending: false });

    // SR4: Secure Exception Handling
    if (error) {
      alert("Failed to fetch routes");
      return;
    }

    setRoutes(data || []);
  };

  // ✅ FETCH OPERATORS
  const fetchOperators = async () => {
    const { data } = await supabase.from("operators").select("*");
    setOperators(data || []);
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
        await fetchRoutes();
        await fetchOperators();
      } catch (err) {
        console.error("Security check failed:", err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  // 🔍 FILTER
  const filteredRoutes = routes.filter((r) =>
    r.route_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ✅ ADD ROUTE
  const handleAddRoute = async () => {
    const { from, to, operator_id, distance, duration, price, frequency } =
      newRoute;

    // SR2: Input Validation
    // SR5: Input Length Limits
    if (!from || !to || !operator_id) return alert("Missing required fields");
    if (from.length > 100 || to.length > 100) return alert("Invalid city name");
    if (distance && isNaN(Number(distance)))
      return alert("Distance must be number");
    if (price && isNaN(Number(price))) return alert("Price must be number");

    const { error } = await supabase.from("routes").insert([
      {
        // 🔥 KEEP EXISTING (for UI display)
        route_name: `${from} → ${to}`,

        // ✅ NEW (for backend search - IMPORTANT)
        from_city: from,
        to_city: to,

        operator_id,
        distance: Number(distance) || 0,
        duration,
        price: Number(price),
        frequency: Number(frequency),
        is_active: true,
      },
    ]);

    // SR4: Secure Exception Handling
    if (error) {
      alert("Failed to add route");
      return;
    }

    fetchRoutes();
    setIsAddDialogOpen(false);
  };

  // ✅ DELETE
  const handleDeleteRoute = async (id: string) => {
    const { error } = await supabase.from("routes").delete().eq("id", id);

    // SR4
    if (error) {
      alert("Failed to delete route");
      return;
    }

    fetchRoutes();
  };

  const handleUpdateRoute = async () => {
    const { operator_id, price, frequency, is_active } = selectedRoute;

    if (!operator_id) return alert("Operator required");
    if (isNaN(Number(price))) return alert("Invalid price");
    if (isNaN(Number(frequency))) return alert("Invalid frequency");

    const { error } = await supabase
      .from("routes")
      .update({
        operator_id,
        price: Number(price),
        frequency: Number(frequency),
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRoute.id);

    if (error) {
      alert("Failed to update route");
      return;
    }

    fetchRoutes();
    setIsEditDialogOpen(false);
  };

  const handleToggleStatus = async (route: any) => {
    const { error } = await supabase
      .from("routes")
      .update({
        is_active: !route.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", route.id);

    if (error) {
      alert("Failed to update status");
      return;
    }

    fetchRoutes();
  };

  const autoFill = async (route: any) => {
    const result = await getDistanceAndDuration(route.from, route.to);

    if (result) {
      setNewRoute((prev) => ({
        ...prev,
        distance: result.distance.toString(),
        duration: result.duration,
      }));
    }
  };

  const getCoords = async (city: string) => {
    const apiKey =
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkyZWNhYmNhYWQ0MTRiNjQ4N2VkYzkyNDY0NmZkNGVjIiwiaCI6Im11cm11cjY0In0=";

    const res = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${city}`,
    );

    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      throw new Error("Invalid location");
    }

    return data.features[0].geometry.coordinates;
  };

  const getDistanceAndDuration = async (from: string, to: string) => {
    try {
      const apiKey =
        "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkyZWNhYmNhYWQ0MTRiNjQ4N2VkYzkyNDY0NmZkNGVjIiwiaCI6Im11cm11cjY0In0=";

      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [await getCoords(from), await getCoords(to)],
          }),
        },
      );

      const data = await res.json();

      // 🔥 ADD THIS CHECK
      if (!data.routes || data.routes.length === 0) {
        throw new Error("No route found");
      }

      const distanceKm = data.routes[0].summary.distance / 1000;
      const durationMin = data.routes[0].summary.duration / 60;

      return {
        distance: Math.round(distanceKm),
        duration: `${Math.floor(durationMin / 60)}h ${Math.round(durationMin % 60)}m`,
      };
    } catch (err) {
      console.log(err);
      alert("Invalid location or API failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Routes</h1>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Route</DialogTitle>
              <DialogDescription>Enter route details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Select
                onValueChange={(v) => {
                  const updated = { ...newRoute, from: v };
                  if (updated.from === updated.to) {
                    alert("From and To cannot be the same");
                    return;
                  }
                  setNewRoute(updated);

                  if (updated.from && updated.to) autoFill(updated);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select From City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                onValueChange={(v) => {
                  const updated = { ...newRoute, to: v };
                  if (updated.from === updated.to) {
                    alert("From and To cannot be the same");
                    return;
                  }
                  setNewRoute(updated);

                  if (updated.from && updated.to) autoFill(updated);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select To City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                onValueChange={(v) =>
                  setNewRoute({ ...newRoute, operator_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
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
                placeholder="Distance (number)"
                value={newRoute.distance}
                readOnly
              />

              <Input
                placeholder="Duration"
                value={newRoute.duration}
                readOnly
              />
              <Input
                placeholder="Price"
                onChange={(e) =>
                  setNewRoute({ ...newRoute, price: e.target.value })
                }
              />

              <Input
                placeholder="Frequency (number)"
                onChange={(e) =>
                  setNewRoute({ ...newRoute, frequency: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button onClick={handleAddRoute}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Routes</CardTitle>

            <div className="w-64">
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredRoutes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.route_name}</TableCell>
                  <TableCell>{r.operators?.name}</TableCell>
                  <TableCell>{r.distance} km</TableCell>
                  <TableCell>{r.duration}</TableCell>
                  <TableCell>RM{r.price}</TableCell>
                  <TableCell>{r.frequency} trips/day</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={r.is_active ? "default" : "secondary"}
                      onClick={() => handleToggleStatus(r)}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedRoute(r);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteRoute(r.id)}
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4">
              {/* Operator */}
              <div className="flex items-center gap-4">
                <span className="w-40 font-medium">Operator:</span>
                <Select
                  value={selectedRoute.operator_id}
                  onValueChange={(v) =>
                    setSelectedRoute({ ...selectedRoute, operator_id: v })
                  }
                >
                  <SelectTrigger className="flex-1">
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
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="w-40 font-medium">Price (RM):</span>
                <Input
                  className="flex-1"
                  value={selectedRoute.price}
                  onChange={(e) =>
                    setSelectedRoute({
                      ...selectedRoute,
                      price: e.target.value,
                    })
                  }
                />
              </div>

              {/* Frequency */}
              <div className="flex items-center gap-4">
                <span className="w-40 font-medium">Frequency (trips/day):</span>
                <Input
                  className="flex-1"
                  value={selectedRoute.frequency}
                  onChange={(e) =>
                    setSelectedRoute({
                      ...selectedRoute,
                      frequency: e.target.value,
                    })
                  }
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <span className="w-40 font-medium">Status:</span>
                <Button
                  variant={selectedRoute.is_active ? "default" : "secondary"}
                  onClick={() =>
                    setSelectedRoute({
                      ...selectedRoute,
                      is_active: !selectedRoute.is_active,
                    })
                  }
                >
                  {selectedRoute.is_active ? "Active" : "Inactive"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleUpdateRoute}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
