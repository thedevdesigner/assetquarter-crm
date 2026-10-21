"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface GumtreePayload {
  location: string;
  locationId?: number | string;
}

interface GumtreeAutocompletionProps {
  onFetchListings: (payload: GumtreePayload) => void;
  isLoadingListings: boolean;
}

export function GumtreeAutocompletion({
  onFetchListings,
  isLoadingListings,
}: GumtreeAutocompletionProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<{ 
    name: string; 
    id?: number | string;
  } | null>(null);

  // 1. Direct fetch on input change with robust response unboxing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedItem(null);

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${apiUrl}/api/v1/gumtree/typeahead?query=${value}`)
      .then((res) => (res.ok ? res.json() : { locationList: [] }))
      .then((jsonResult) => {
        // Unbox whether response is wrapped in { data: { locationList: [...] } } or root level
        const rootData = jsonResult.data || jsonResult;
        const list = rootData.locationList || rootData.locations || (Array.isArray(rootData) ? rootData : []);
        setSuggestions(list);
      })
      .catch(() => setSuggestions([]));
  };

  // 2. Cache selected item name and id
  const handleSelectOption = (item: any) => {
    const labelName = item.name || item.displayName || item.label || "";
    
    setQuery(labelName);
    setSelectedItem({
      name: labelName,
      id: item.id,
    });
    setSuggestions([]);
  };

  // 3. Construct payload and trigger fetch request
  const handleSubmit = () => {
    if (!selectedItem || !selectedItem.name) return;

    const payload: GumtreePayload = {
      location: selectedItem.name,
      locationId: selectedItem.id,
    };

    onFetchListings(payload);
  };

  return (
    <div className="pt-2 border-t flex flex-col md:flex-row items-end justify-between gap-4">
      {/* Search Input & Auto-Completion Dropdown */}
      <div className="relative flex-1 w-full">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
          Gumtree Location Search
        </label>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search location (e.g. London Bridge)..."
          className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => {
              const locationName = item.name || item.displayName || item.label;
              const locationId = item.id;

              return (
                <div
                  key={`${locationId}-${idx}`}
                  onClick={() => handleSelectOption(item)}
                  className="px-4 py-2 text-sm hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <span className="font-medium text-foreground">{locationName}</span>
                  {locationId && (
                    <span className="text-xs text-muted-foreground font-mono">ID: {locationId}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Button (Disabled until autocomplete is selected) */}
      <Button
        onClick={handleSubmit}
        disabled={isLoadingListings || !selectedItem}
        className="px-6 h-11 text-base font-semibold shadow-md w-full md:w-auto"
      >
        Fetch Gumtree Listings
      </Button>
    </div>
  );
}