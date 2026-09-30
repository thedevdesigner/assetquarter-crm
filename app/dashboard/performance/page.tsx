"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, TrendingUp, BarChart3, Award, PhoneCall, Eye, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function PerformancePage() {
  const [items, setItems] = useState<any[]>([]);
  
  // Default selected date: Today
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("property_followups") || "[]");
    setItems(data);
  }, []);

  // Filter items strictly for the selected single day
  const filteredItems = items.filter(i => {
    if (!i.dateAdded || !selectedDate) return false;
    const itemDateStr = i.dateAdded.split("T")[0];
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    return itemDateStr === selectedDateStr;
  });

  // Calculate Key Pipeline Metrics for that specific day
  const totalTracked = filteredItems.length;
  const totalCalled = filteredItems.filter(i => i.status && i.status !== "pending").length;
  const totalContacted = filteredItems.filter(i => ["contacted", "interested", "viewing_booked", "sa_friendly"].includes(i.status)).length;
  const totalInterested = filteredItems.filter(i => ["interested", "viewing_booked", "sa_friendly"].includes(i.status)).length;
  const viewingsBooked = filteredItems.filter(i => i.status === "viewing_booked" || i.status === "sa_friendly").length;
  const saFriendlyAgents = filteredItems.filter(i => i.status === "sa_friendly").length;

  // Prepare data for Recharts graph
  const chartData = [
    { name: "Tracked", count: totalTracked },
    { name: "Called", count: totalCalled },
    { name: "Contacted", count: totalContacted },
    { name: "Interested", count: totalInterested },
    { name: "Viewings", count: viewingsBooked },
    { name: "SA-Friendly", count: saFriendlyAgents },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      
      {/* Header & Single-Day Calendar Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Performance & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a specific day to review your sourcing activity and SA-friendly conversions.</p>
        </div>

        {/* Shadcn Popover Single-Day Calendar (Blocking Future Dates) */}
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal h-11 rounded-xl",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()} // Blocks all future dates completely
    
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Tracked" value={totalTracked} icon={Building2} />
        <MetricCard label="Total Called" value={totalCalled} icon={PhoneCall} />
        <MetricCard label="Contacted" value={totalContacted} icon={TrendingUp} />
        <MetricCard label="Interested" value={totalInterested} icon={BarChart3} />
        <MetricCard label="Viewings" value={viewingsBooked} icon={Eye} />
        <MetricCard label="SA-Friendly" value={saFriendlyAgents} icon={Award} highlight />
      </div>

      {/* Graphical Breakdown (Recharts) */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold">Daily Pipeline Activity ({selectedDate ? format(selectedDate, "PP") : ""})</h2>
          <p className="text-xs text-muted-foreground">Visualizing movement and conversion results for the chosen day</p>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ label, value, icon: Icon, highlight = false }: { label: string; value: number; icon: any; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${highlight ? 'bg-primary/5 border-primary/30 shadow-xs' : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}