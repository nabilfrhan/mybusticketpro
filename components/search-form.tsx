"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  ArrowLeftRight,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "./ui/card";

export function SearchForm() {
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  const [fromCities, setFromCities] = useState<string[]>([]);
  const [toCities, setToCities] = useState<string[]>([]);

  // ================= FETCH CITIES =================
  useEffect(() => {
    const fetchCities = async () => {
      // SR3: Safe DB query
      const { data, error } = await supabase
        .from("routes")
        .select("from_city, to_city");

      // SR4: Error handling
      if (error) {
        console.error("Fetch cities error:", error);
        return;
      }

      // SR5: Remove duplicates
      const fromSet = new Set(data?.map((r) => r.from_city));
      const toSet = new Set(data?.map((r) => r.to_city));

      setFromCities(Array.from(fromSet));
      setToCities(Array.from(toSet));
    };

    fetchCities();
  }, []);

  // ================= SEARCH =================
  const handleSearch = async () => {
    // SR1: Input validation
    if (!from || !to || !date) {
      alert("Please fill all fields");
      return;
    }

    try {
      // SR2: Safe navigation (single source of truth = URL)
      router.push(
        `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`,
      );
    } catch (err) {
      // SR3: Unexpected error handling
      console.error("Search redirect error:", err);
      alert("Something went wrong");
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardContent className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* FROM */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Select onValueChange={setFrom}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Departure city" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SWAP BUTTON */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const temp = from;
                setFrom(to);
                setTo(temp);
              }}
              className="hidden lg:flex self-end mb-1"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            {/* TO */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Select onValueChange={setTo}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Arrival city" />
                  </SelectTrigger>
                  <SelectContent>
                    {toCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DATE */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} // SR: prevent past date
                  className="pl-10"
                />
              </div>
            </div>

            {/* SEARCH BUTTON */}
            <Button type="submit" size="lg" className="lg:px-8">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
