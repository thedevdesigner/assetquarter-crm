"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface RightmovePayload {
  location: string;
  regionId: string;
  sinceAdded: string;
  pagination: string;
}

interface RightmoveAutocompletionProps {
  onFetchListings: (payload: RightmovePayload) => void;
  isLoadingListings: boolean;
}

export function RightmoveAutocompletion({
  onFetchListings,
  isLoadingListings,
}: RightmoveAutocompletionProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Cache selected auto-completion item
  const [selectedItem, setSelectedItem] = useState<{ displayName: string; id: string } | null>(null);
  
  // Default search parameters
  const [sinceAdded, setSinceAdded] = useState("14");

  // 1. Direct fetch on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedItem(null); // Invalidate selection when user types again

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${apiUrl}/api/v1/rightmove/typeahead?query=${encodeURIComponent(value)}`)
      .then((res) => (res.ok ? res.json() : { matches: [] }))
      .then((data) => {
        setSuggestions(data?.matches || data?.typeAheadLocations || []);
      })
      .catch(() => setSuggestions([]));
  };

  // 2. Cache selected item with safe property fallbacks
  const handleSelectOption = (item: any) => {
    const labelText = item.displayName || item.normalisedSearchTerm || item.label || item.locationName;
    const itemId = item.id || item.locationIdentifier || item.value;

    setQuery(labelText);
    setSelectedItem({
      displayName: labelText,
      id: itemId,
    });
    setSuggestions([]);
  };

  // 3. Construct URI-encoded payload and trigger POST request
 const handleSubmit = () => {
  if (!selectedItem || !selectedItem.displayName || !selectedItem.id) return;

  const rawId = String(selectedItem.id);
  const formattedRegion = rawId.startsWith("REGION^") ? rawId : `REGION^${rawId}`;

  // Pass the encoded payload object directly up to page.tsx
  const payload: RightmovePayload = {
    location: selectedItem.displayName,
    regionId: formattedRegion,
    sinceAdded: sinceAdded,
    pagination: "0",
  };

  onFetchListings(payload);
};

  return (
    <div className="pt-2 border-t flex flex-col md:flex-row items-end justify-between gap-4">
      {/* Search Input & Auto-Completion Dropdown */}
      <div className="relative flex-1 w-full">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
          Search Location
        </label>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search UK area (e.g. London)..."
          className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => {
              const displayName = item.displayName || item.normalisedSearchTerm || item.label;
              const itemId = item.id || item.locationIdentifier;

              return (
                <div
                  key={`${itemId}-${idx}`}
                  onClick={() => handleSelectOption(item)}
                  className="px-4 py-2 text-sm hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <span className="font-medium text-foreground">{displayName}</span>
                  <span className="text-xs text-muted-foreground font-mono">{itemId}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dormant / Secondary Filter (Disabled until autocomplete is selected) */}
      <div className="w-full md:w-48">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
          Added Since
        </label>
        <select
          value={sinceAdded}
          onChange={(e) => setSinceAdded(e.target.value)}
          disabled={!selectedItem}
          className="w-full px-3 py-2.5 bg-background border rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="1">Last 24 hours</option>
          <option value="3">Last 3 days</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
        </select>
      </div>

      {/* Submit Button (Disabled until autocomplete is selected) */}
      <Button
        onClick={handleSubmit}
        disabled={isLoadingListings || !selectedItem}
        className="px-6 h-11 text-base font-semibold shadow-md w-full md:w-auto"
      >
        Fetch Rightmove Listings
      </Button>
    </div>
  );
}