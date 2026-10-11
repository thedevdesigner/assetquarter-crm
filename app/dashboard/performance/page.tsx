"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  PhoneCall, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2,
  Percent,
  RefreshCw,
  PhoneForwarded,
  UserCheck,
  CalendarCheck2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface FollowUpItem {
  id: string;
  title: string;
  price: string;
  location: string;
  phone: string;
  url: string;
  imageUrl: string;
  dateAdded: string; // ISO String
  status: 
    | "pending" 
    | "no_answer" 
    | "callback" 
    | "sa_pending" 
    | "sa_allowed" 
    | "viewing_booked" 
    | "rejected" 
    | "not_interested";
  attempts: number;
  notes: string;
  customerName?: string;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000"}/api/v1/followups`;

export default function PerformancePage() {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch directly from the Turso database API
  const loadPerformanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch performance metrics from database:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  // Filter items strictly for the selected single day
  const filteredItems = items.filter((i) => {
    if (!i.dateAdded || !selectedDate) return false;
    const itemDateStr = i.dateAdded.split("T")[0];
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    return itemDateStr === selectedDateStr;
  });

  // Calculate REAL Metrics from FollowUpItem schema statuses
  const totalTracked = filteredItems.length;
  const pendingCount = filteredItems.filter((i) => i.status === "pending").length;
  const noAnswerCount = filteredItems.filter((i) => i.status === "no_answer").length;
  const callbackCount = filteredItems.filter((i) => i.status === "callback").length;
  const saPendingCount = filteredItems.filter((i) => i.status === "sa_pending").length;
  const saAllowedCount = filteredItems.filter((i) => i.status === "sa_allowed").length;
  const viewingBookedCount = filteredItems.filter((i) => i.status === "viewing_booked").length;
  const rejectedCount = filteredItems.filter((i) => i.status === "rejected").length;
  const notInterestedCount = filteredItems.filter((i) => i.status === "not_interested").length;

  // Calculate aggregate attempts logged across all listings for the chosen day
  const totalAttempts = filteredItems.reduce((acc, curr) => acc + (Number(curr.attempts) || 0), 0);

  // Calculate Conversion Efficiency (Viewing Booked + SA Allowed as successful conversions)
  const successfulConversions = viewingBookedCount + saAllowedCount;
  const conversionRate = totalTracked > 0 
    ? ((successfulConversions / totalTracked) * 100).toFixed(1) 
    : "0.0";

  // Comprehensive Chart Data reflecting all pipeline stages
  const chartData = [
    { name: "Pending", count: pendingCount, color: "#94a3b8" },         // Slate
    { name: "No Answer", count: noAnswerCount, color: "#71717a" },     // Zinc
    { name: "Callback", count: callbackCount, color: "#f59e0b" },       // Amber
    { name: "SA Pending", count: saPendingCount, color: "#3b82f6" },   // Blue
    { name: "SA Allowed", count: saAllowedCount, color: "#10b981" },   // Emerald
    { name: "Viewing", count: viewingBookedCount, color: "#6366f1" },  // Indigo
    { name: "Rejected", count: rejectedCount, color: "#f43f5e" },       // Rose
    { name: "Not Int.", count: notInterestedCount, color: "#e11d48" }, // Deep Rose
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full min-h-screen bg-background">
      
      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            CRM Performance Analytics
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time pipeline analysis and outreach metrics calculated strictly from your database records.
          </p>
        </div>

        {/* Date Selector */}
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal h-11 rounded-xl border bg-background",
                  !selectedDate && "text-muted-foreground"
                )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Tracked" value={totalTracked} icon={Building2} />
        <MetricCard label="Pending" value={pendingCount} icon={Clock} color="text-slate-500" />
        <MetricCard label="No Answer" value={noAnswerCount} icon={PhoneCall} color="text-zinc-500" />
        <MetricCard label="Callback" value={callbackCount} icon={PhoneForwarded} color="text-amber-500" />
        <MetricCard label="SA Pending" value={saPendingCount} icon={TrendingUp} color="text-blue-500" />
        <MetricCard label="SA Allowed" value={saAllowedCount} icon={UserCheck} color="text-emerald-500" highlight />
        <MetricCard label="Viewing Booked" value={viewingBookedCount} icon={CalendarCheck2} color="text-indigo-500" highlight />
        <MetricCard label="Rejected" value={rejectedCount} icon={XCircle} color="text-rose-500" />
        <MetricCard label="Not Interested" value={notInterestedCount} icon={XCircle} color="text-rose-600" />
        <MetricCard label="Attempts Made" value={totalAttempts} icon={PhoneCall} />
      </div>

      {/* Secondary Highlights (Conversion Rate Bar) */}
      <div className="bg-card p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Conversion Efficiency</h3>
            <p className="text-2xl font-black text-foreground">{conversionRate}%</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center sm:text-right max-w-sm">
          Percentage of property listings added on {format(selectedDate, "PP")} that successfully reached <span className="font-semibold text-emerald-600">SA Allowed</span> or <span className="font-semibold text-indigo-600">Viewing Booked</span>.
        </p>
      </div>

      {/* Graphical Breakdown (Recharts) */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Pipeline Stage Distribution ({format(selectedDate, "PP")})
          </h2>
          <p className="text-xs text-muted-foreground">
            Status counts across all pipeline categories for listings added on the selected day
          </p>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))', 
                  borderRadius: '0.75rem', 
                  color: 'hsl(var(--foreground))' 
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  color = "text-muted-foreground",
  highlight = false 
}: { 
  label: string; 
  value: number; 
  icon: any; 
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${highlight ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}