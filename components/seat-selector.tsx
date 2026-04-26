"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface Seat {
  id: string
  row: number
  column: string
  status: "available" | "booked" | "selected"
  price: number
  type: "regular"
}

interface SeatSelectorProps {
  onSeatSelect: (seats: Seat[]) => void
  maxSeats?: number
  totalSeats?: number
  bookedSeatIds?: string[]
  seatPrice?: number
}

const columns = ["A", "B", "C", "D"]

const generateSeats = (
  totalSeats: number,
  bookedSeatIds: string[],
  seatPrice: number,
): Seat[] => {
  const seats: Seat[] = []
  const normalizedBookedSeatIds = new Set(
    bookedSeatIds.map((seatId) => seatId.trim().toUpperCase()),
  )

  for (let index = 0; index < totalSeats; index++) {
    const row = Math.floor(index / columns.length) + 1
    const column = columns[index % columns.length]
    const id = `${row}${column}`

    seats.push({
      id,
      row,
      column,
      status: normalizedBookedSeatIds.has(id) ? "booked" : "available",
      price: seatPrice,
      type: "regular",
    })
  }

  return seats
}

export function SeatSelector({
  onSeatSelect,
  maxSeats = 6,
  totalSeats = 40,
  bookedSeatIds = [],
  seatPrice = 0,
}: SeatSelectorProps) {
  const initialSeats = useMemo(
    () => generateSeats(totalSeats, bookedSeatIds, seatPrice),
    [bookedSeatIds, seatPrice, totalSeats],
  )
  const [seats, setSeats] = useState<Seat[]>(initialSeats)

  useEffect(() => {
    setSeats(initialSeats)
  }, [initialSeats])

  useEffect(() => {
    onSeatSelect(seats.filter((seat) => seat.status === "selected"))
  }, [onSeatSelect, seats])

  const handleSeatClick = (seatId: string) => {
    setSeats((prevSeats) => {
      const selectedCount = prevSeats.filter(
        (seat) => seat.status === "selected",
      ).length

      return prevSeats.map((seat) => {
        if (seat.id !== seatId || seat.status === "booked") {
          return seat
        }

        if (seat.status === "selected") {
          return { ...seat, status: "available" }
        }

        if (selectedCount >= maxSeats) {
          return seat
        }

        return { ...seat, status: "selected" }
      })
    })
  }

  const rows = Array.from(new Set(seats.map((seat) => seat.row)))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-primary bg-card" />
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="text-sm text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-muted" />
          <span className="text-sm text-muted-foreground">Booked</span>
        </div>
      </div>

      <div className="mx-auto max-w-xs rounded-lg border bg-card p-6">
        <div className="mb-6 flex justify-end">
          <div className="flex h-10 w-16 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            Driver
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row) => {
            const rowSeats = seats.filter((seat) => seat.row === row)

            return (
              <div key={row} className="flex items-center justify-between">
                <div className="flex gap-2">
                  {rowSeats
                    .filter((seat) => ["A", "B"].includes(seat.column))
                    .map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat.id)}
                        disabled={seat.status === "booked"}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded text-sm font-medium transition-colors",
                          seat.status === "available" &&
                            "border-2 border-primary bg-card text-foreground hover:bg-primary/10",
                          seat.status === "selected" &&
                            "bg-primary text-primary-foreground",
                          seat.status === "booked" &&
                            "cursor-not-allowed bg-muted text-muted-foreground",
                        )}
                        aria-label={`Seat ${seat.id} - ${seat.status}`}
                      >
                        {seat.id}
                      </button>
                    ))}
                </div>

                <div className="w-8 text-center text-xs text-muted-foreground">
                  {row}
                </div>

                <div className="flex gap-2">
                  {rowSeats
                    .filter((seat) => ["C", "D"].includes(seat.column))
                    .map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat.id)}
                        disabled={seat.status === "booked"}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded text-sm font-medium transition-colors",
                          seat.status === "available" &&
                            "border-2 border-primary bg-card text-foreground hover:bg-primary/10",
                          seat.status === "selected" &&
                            "bg-primary text-primary-foreground",
                          seat.status === "booked" &&
                            "cursor-not-allowed bg-muted text-muted-foreground",
                        )}
                        aria-label={`Seat ${seat.id} - ${seat.status}`}
                      >
                        {seat.id}
                      </button>
                    ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Back of Bus
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        You can select up to {maxSeats} seats
      </div>
    </div>
  )
}
