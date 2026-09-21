"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Phone, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Minus, 
  Filter,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowUpItem {
  id: string; // Unique identifier or phone number key
  title: string;
  price: string;
  location: string;
  phone: string;
  url: string;
  imageUrl: string;
  dateAdded: string; // ISO string for time filtering
  status: "pending" | "contacted" | "converted" | "rejected";
  attempts: number; // Max 3
  notes: string;
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Load follow-ups from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("property_followups");
    if (saved) {
      try {
        setFollowUps(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse follow-ups storage:", e);
      }
    }
  }, []);

  // Save changes to localStorage
  const saveToStorage = (updatedList: FollowUpItem[]) => {
    setFollowUps(updatedList);
    localStorage.setItem("property_followups", JSON.stringify(updatedList));
  };

  // Update specific follow-up property fields
  const updateFollowUp = (id: string, updates: Partial<FollowUpItem>) => {
    const updated = followUps.map(item => item.id === id ? { ...item, ...updates } : item);
    saveToStorage(updated);
  };

  // Delete item from follow-ups
  const removeItem = (id: string) => {
    const updated = followUps.filter(item => item.id !== id);
    saveToStorage(updated);
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
  const filteredItems = followUps.filter(item => {
    // Status filter
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    
    // Time filter
    if (filterTime !== "all" && getTimeCategory(item.dateAdded) !== filterTime) return false;

    // Search query match (title, location, phone)
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(query);
      const matchLocation = item.location?.toLowerCase().includes(query);
      const matchPhone = item.phone?.toLowerCase().includes(query);
      if (!matchTitle && !matchLocation && !matchPhone) return false;
    }

    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full min-h-screen flex flex-col bg-background relative">
      
      {/* Top Navigation / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground pt-2">Follow-Up Pipeline CRM</h1>
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
          {/* Status Filter */}
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending / Interested</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted / Viewing</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Time Filter */}
          <select 
            value={filterTime} 
            onChange={(e) => setFilterTime(e.target.value)}
            className="h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Time Periods</option>
            <option value="today">Today&apos;s Follow-Ups</option>
            <option value="yesterday">Yesterday&apos;s Follow-Ups</option>
            <option value="older">Older Records</option>
          </select>
        </div>

        {/* Search Bar */}
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
      {filteredItems.length === 0 ? (
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
                <div className="relative md:w-64 h-48 md:h-auto bg-zinc-950 flex-shrink-0 flex items-center justify-center">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"} 
                    alt={item.title} 
                    className="w-full h-full object-contain"
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
                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                        <select 
                          value={item.status}
                          onChange={(e) => updateFollowUp(item.id, { status: e.target.value as any })}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                            item.status === 'converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40' :
                            item.status === 'contacted' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40' :
                            item.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40' :
                            'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted">Converted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      {/* Contact Attempts Counter (Max 3) */}
                      <div className="flex items-center gap-2 bg-muted/60 px-3 py-1 rounded-lg border">
                        <span className="text-xs font-semibold text-muted-foreground">Follow-Up Attempts:</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateFollowUp(item.id, { attempts: Math.max(0, item.attempts - 1) })}
                            disabled={item.attempts <= 0}
                            className="p-1 rounded hover:bg-background disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold px-1.5">{item.attempts} / 3</span>
                          <button 
                            onClick={() => updateFollowUp(item.id, { attempts: Math.min(3, item.attempts + 1) })}
                            disabled={item.attempts >= 3}
                            className="p-1 rounded hover:bg-background disabled:opacity-30"
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
                        onChange={(e) => updateFollowUp(item.id, { notes: e.target.value })}
                        className="w-full h-9 px-3 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <div>
                      {item.phone ? (
                        <a 
                          href={`tel:${item.phone}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" /> Call {item.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No direct phone number</span>
                      )}
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
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