"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Phone, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Clock, 
  Trash2, 
  Plus, 
  Minus, 
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  User  
} from "lucide-react";

export type FollowUpStatus = 
  | "pending" 
  | "no_answer" 
  | "callback" 
  | "sa_pending" 
  | "sa_allowed" 
  | "viewing_booked" 
  | "rejected" 
  | "not_interested";

interface FollowUpItem {
  id: string; // Clean UUID key
  title: string;
  price: string;
  location: string;
  phone: string;
  url: string;
  imageUrl: string;
  dateAdded: string; // ISO string for time filtering
  status: FollowUpStatus;
  attempts: number; // Max 3
  customerName?: string; // Added Customer Name field
  notes: string;
}

// Helper to format raw status values into human-readable labels
const STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: "Pending",
  no_answer: "No Answer",
  callback: "Callback",
  sa_pending: "SA Pending",
  sa_allowed: "SA Allowed",
  viewing_booked: "Viewing Booked",
  rejected: "Rejected",
  not_interested: "Not Interested",
};

interface Notification {
  id: number;
  type: "success" | "info" | "error";
  message: string;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000"}/api/v1/followups`;

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: "success" | "info" | "error", message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Fetch directly from Turso Database API on mount
  const fetchFromDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsSyncing(true);

      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setFollowUps(result.data);
      }
    } catch (error) {
      console.error("Database fetch failed:", error);
      addNotification("error", "Failed to fetch follow-ups from database.");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchFromDatabase();
  }, [fetchFromDatabase]);

  // 1. Delete Handler
  const handleDelete = async (id: string, title: string) => {
    // Optimistic UI update
    setFollowUps((prev) => prev.filter((item) => item.id !== id));
    addNotification("info", `Removed "${title || "Property"}" from follow-ups.`);

    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete DB sync failed:", err);
      addNotification("error", "Failed to delete record on server.");
      fetchFromDatabase(); // Rollback/Re-sync
    }
  };

  // 2. Status Handler
  const handleStatusChange = async (id: string, newStatusStr: string) => {
    const newStatus = newStatusStr as FollowUpStatus;
    
    // Optimistic UI update
    setFollowUps((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );

    const displayLabel = STATUS_LABELS[newStatus] || newStatus;
    addNotification("info", `Updated status to "${displayLabel}".`);

    try {
      await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Status DB sync failed:", err);
      addNotification("error", "Failed to update status on server.");
      fetchFromDatabase();
    }
  };

  // 3. Contact Attempts Counter Handler (Bounded 0 to 3)
  const handleAttemptsChange = async (id: string, newAttempts: number) => {
    const boundedAttempts = Math.min(Math.max(newAttempts, 0), 3);
    
    // Optimistic UI update
    setFollowUps((prev) =>
      prev.map((item) => (item.id === id ? { ...item, attempts: boundedAttempts } : item))
    );

    addNotification("info", `Follow-up attempts updated to ${boundedAttempts}/3.`);

    try {
      await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts: boundedAttempts }),
      });
    } catch (err) {
      console.error("Attempts DB sync failed:", err);
      addNotification("error", "Failed to update attempts on server.");
      fetchFromDatabase();
    }
  };

  // 4. Local Notes Text Change (State only)
  const handleNotesChange = (id: string, text: string) => {
    setFollowUps((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: text } : item))
    );
  };

  // 5. Notes Blur API Auto-Save Handler
  const handleNotesBlur = async (id: string, notesText: string) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });

      if (response.ok) {
        addNotification("success", "Notes updated successfully.");
      }
    } catch (err) {
      console.error("Notes DB sync failed:", err);
      addNotification("error", "Failed to save notes to database.");
    }
  };

  // Time categorization helper
  const getTimeCategory = (dateString: string) => {
    const today = new Date().toDateString();
    const itemDate = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (itemDate.toDateString() === today) return "today";
    if (itemDate.toDateString() === yesterday.toDateString()) return "yesterday";
    return "older";
  };

  // Filter logic
  const filteredItems = followUps.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterTime !== "all" && getTimeCategory(item.dateAdded) !== filterTime) return false;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(query);
      const matchLocation = item.location?.toLowerCase().includes(query);
      const matchPhone = item.phone?.toLowerCase().includes(query);
      const matchCustomer = item.customerName?.toLowerCase().includes(query);
      if (!matchTitle && !matchLocation && !matchPhone && !matchCustomer) return false;
    }

    return true;
  });

  // Color helper for status select dropdown & badges
  const getStatusStyle = (status: FollowUpStatus) => {
    switch (status) {
      case "sa_allowed":
        return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40";
      case "viewing_booked":
        return "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40";
      case "callback":
        return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40";
      case "sa_pending":
        return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40";
      case "no_answer":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
      case "rejected":
      case "not_interested":
        return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40";
      case "pending":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full min-h-screen flex flex-col bg-background relative">
      
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {notifications.map(n => {
          let bgStyle = "bg-blue-600 text-white";
          let IconComponent = Info;
          if (n.type === "success") {
            bgStyle = "bg-emerald-600 text-white";
            IconComponent = CheckCircle2;
          } else if (n.type === "error") {
            bgStyle = "bg-rose-600 text-white";
            IconComponent = AlertCircle;
          }

          return (
            <div key={n.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg ${bgStyle}`}>
              <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium leading-tight">{n.message}</div>
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Follow-Up Pipeline CRM</h1>
            {isSyncing && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Syncing...
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Manage, track, and log communication stages with property listings</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-xl border">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <span className="font-bold">{followUps.length}</span> Total Tracked
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="no_answer">No Answer</option>
            <option value="callback">Callback</option>
            <option value="sa_pending">SA Pending</option>
            <option value="sa_allowed">SA Allowed</option>
            <option value="viewing_booked">Viewing Booked</option>
            <option value="rejected">Rejected</option>
            <option value="not_interested">Not Interested</option>
          </select>

          <select 
            value={filterTime} 
            onChange={(e) => setFilterTime(e.target.value)}
            className="h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Time Periods</option>
            <option value="today">Today&apos;s Follow-Ups</option>
            <option value="yesterday">Yesterday&apos;s Follow-Ups</option>
            <option value="older">Older Records</option>
          </select>
        </div>

        <div className="w-full md:w-72">
          <input 
            type="text" 
            placeholder="Search by title, location, phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-[400px] rounded-2xl border border-dashed bg-card/50 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-60" />
          <p className="text-sm font-medium">Fetching follow-ups from Turso DB...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="h-[400px] rounded-2xl border border-dashed bg-card/50 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Clock className="h-12 w-12 opacity-20" />
          <p className="text-base font-medium">No follow-up records found matching your filters.</p>
          <p className="text-xs text-muted-foreground">You can add properties to your follow-up list directly from the main dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredItems.map((item) => {
            const timeCategory = getTimeCategory(item.dateAdded);
            
            return (
              <div 
                key={item.id} 
                className="bg-card rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row"
              >
                {/* Left Side: Thumbnail Preview */}
                <div className="relative w-full md:w-80 h-64 md:h-64 bg-zinc-950 flex-shrink-0 group overflow-hidden rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"} 
                    alt={item.title} 
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-md uppercase tracking-wider ${
                      timeCategory === 'today' ? 'bg-emerald-600 text-white' : 
                      timeCategory === 'yesterday' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-white'
                    }`}>
                      {timeCategory}
                    </span>
                  </div>
                </div>

                {/* Right Side: CRM Details & Actions */}
                <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        {item.url ? (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-lg font-bold tracking-tight text-foreground hover:text-primary flex items-center gap-1.5"
                          >
                            <span className="line-clamp-1">{item.title}</span>
                            <ExternalLink className="h-4 w-4 opacity-70" />
                          </a>
                        ) : (
                          <h2 className="text-lg font-bold tracking-tight text-foreground">{item.title}</h2>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {item.location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.location}</span>
                          )}
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Added: {new Date(item.dateAdded).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-primary">{item.price || 'POA'}</span>
                    </div>

                    {/* CRM Controls Row: Status & Attempt Counter */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                        <select 
                          value={item.status || "pending"}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer transition-colors ${getStatusStyle(item.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="no_answer">No Answer</option>
                          <option value="callback">Callback</option>
                          <option value="sa_pending">SA Pending</option>
                          <option value="sa_allowed">SA Allowed</option>
                          <option value="viewing_booked">Viewing Booked</option>
                          <option value="rejected">Rejected</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 bg-muted/60 px-3 py-1 rounded-lg border">
                        <span className="text-xs font-semibold text-muted-foreground">Follow-Up Attempts:</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleAttemptsChange(item.id, (item.attempts || 0) - 1)}
                            disabled={(item.attempts || 0) <= 0}
                            className="p-1 rounded hover:bg-background disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold px-1.5">{item.attempts || 0} / 3</span>
                          <button 
                            onClick={() => handleAttemptsChange(item.id, (item.attempts || 0) + 1)}
                            disabled={(item.attempts || 0) >= 3}
                            className="p-1 rounded hover:bg-background disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Notes Input */}
                    <div>
                      <input 
                        type="text" 
                        placeholder="Add quick CRM notes (e.g., Called at 2PM, left voicemail)..."
                        value={item.notes || ""}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        onBlur={(e) => handleNotesBlur(item.id, e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.customerName && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted px-3 py-1.5 rounded-xl border">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{item.customerName}</span>
                        </div>
                      )}

                      {item.phone ? (
                        <a 
                          href={`tel:${item.phone}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" /> {item.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No phone available</span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id, item.title)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}