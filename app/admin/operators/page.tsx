"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // 🔥 NEW: Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);

  const [newOperator, setNewOperator] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from("operators")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Failed to fetch operators");
      return;
    }

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
        await fetchOperators();
      } catch (err) {
        console.error("Security check failed:", err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  const filteredOperators = operators.filter(
    (op) =>
      op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ✅ ADD
  const handleAddOperator = async () => {
    const { name, email, phone } = newOperator;

    if (!name || name.length > 100) return alert("Invalid name");
    if (!email.includes("@")) return alert("Invalid email");
    if (!/^[0-9+]+$/.test(phone)) return alert("Invalid phone");

    const { error } = await supabase
      .from("operators")
      .insert([{ name, email, phone, is_active: true }]);

    if (error) {
      alert("Failed to add operator");
      return;
    }

    fetchOperators();
    setNewOperator({ name: "", email: "", phone: "" });
    setIsAddDialogOpen(false);
  };

  // ✅ DELETE
  const handleDeleteOperator = async (id: string) => {
    const { error } = await supabase.from("operators").delete().eq("id", id);

    if (error) {
      alert("Failed to delete");
      return;
    }

    fetchOperators();
  };

  const handleToggleStatus = async (operator: any) => {
    const { error } = await supabase
      .from("operators")
      .update({
        is_active: !operator.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operator.id);

    if (error) {
      alert("Failed to update status");
      return;
    }

    fetchOperators();
  };

  // 🔥 OPEN EDIT
  const handleEditClick = (operator: any) => {
    setSelectedOperator(operator);
    setIsEditDialogOpen(true);
  };

  // 🔥 UPDATE
  const handleUpdateOperator = async () => {
    const { name, email, phone } = selectedOperator;

    if (!name || name.length > 100) return alert("Invalid name");
    if (!email.includes("@")) return alert("Invalid email");
    if (!/^[0-9+]+$/.test(phone)) return alert("Invalid phone");

    const { error } = await supabase
      .from("operators")
      .update({
        name,
        email,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedOperator.id);

    if (error) {
      alert("Failed to update operator");
      return;
    }

    fetchOperators();
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Operators</h1>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Operator
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Operator</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={newOperator.name}
                onChange={(e) =>
                  setNewOperator({ ...newOperator, name: e.target.value })
                }
              />
              <Input
                placeholder="Email"
                value={newOperator.email}
                onChange={(e) =>
                  setNewOperator({ ...newOperator, email: e.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={newOperator.phone}
                onChange={(e) =>
                  setNewOperator({ ...newOperator, phone: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button onClick={handleAddOperator}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Operators</CardTitle>

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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOperators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op.email}</TableCell>
                  <TableCell>{op.phone}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={op.is_active ? "default" : "secondary"}
                      onClick={() => handleToggleStatus(op)}
                    >
                      {op.is_active ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex gap-2">
                      {/* ✏️ EDIT BUTTON */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(op)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* 🗑 DELETE */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteOperator(op.id)}
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

      {/* 🔥 EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Operator</DialogTitle>
          </DialogHeader>

          {selectedOperator && (
            <div className="space-y-4">
              <Input
                value={selectedOperator.name}
                onChange={(e) =>
                  setSelectedOperator({
                    ...selectedOperator,
                    name: e.target.value,
                  })
                }
              />
              <Input
                value={selectedOperator.email}
                onChange={(e) =>
                  setSelectedOperator({
                    ...selectedOperator,
                    email: e.target.value,
                  })
                }
              />
              <Input
                value={selectedOperator.phone}
                onChange={(e) =>
                  setSelectedOperator({
                    ...selectedOperator,
                    phone: e.target.value,
                  })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleUpdateOperator}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
