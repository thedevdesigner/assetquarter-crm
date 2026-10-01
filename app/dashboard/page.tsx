"use client";

import { useState,useEffect } from "react";
import { saveFollowUp } from "../../actions";
import { 
  Phone, 
  Search,
  Database,
  Loader2,
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
  UserPlus
} from "lucide-react";
import { 
  getLocalFollowUps, 
  setLocalFollowUps, 
  normalizeToFollowUp, 
  FollowUpItem 
} from "@/lib/followups";
import { Button } from "@/components/ui/button";
import { SourceToggle } from "@/components/explorer/SourceToggle";
import { RightmoveAutocompletion, RightmovePayload } from "@/components/explorer/RightmoveAutocompletion";

interface Notification {
  id: number;
  type: "success" | "info" | "error";
  message: string;
}

export default function DashboardPage() {

  // Mandatory 10-second frontend cooldown state
const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);
const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

/**
 * 10-second client-side cooldown lock with second-by-second updates
 */
const startCooldownLock = async (durationInSeconds = 20) => {
  setIsCoolingDown(true);
  setCooldownSeconds(durationInSeconds);

  for (let sec = durationInSeconds; sec > 0; sec--) {
    setCooldownSeconds(sec);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  setIsCoolingDown(false);
  setCooldownSeconds(0);
};

  const [source, setSource] = useState<"gumtree" | "rightmove">("gumtree");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [listingData, setListingData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [carouselIndices, setCarouselIndices] = useState<Record<number, number>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const addNotification = (type: "success" | "info" | "error", message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

const handleAddToFollowUp = async (listing: any) => {
  if (!listing) return;

  const sourceUrl = listing.url || listing.propertyUrl || "";
  const existing: FollowUpItem[] = JSON.parse(localStorage.getItem("property_followups") || "[]");

  // Check duplicate by URL instead of ID
  const isDuplicate = existing.some((item) => sourceUrl && item.url === sourceUrl);
  if (isDuplicate) {
    addNotification("info", "This listing is already in your follow-up pipeline.");
    return;
  }

  const newItem: FollowUpItem = {
    id: crypto.randomUUID(), // Clean UUID string
    title: listing.title || listing.displayAddress || "Untitled Property",
    price: typeof listing.price === "string" ? listing.price : "POA",
    location: listing.location || listing.displayAddress || "UK",
    phone: listing.phone || "",
    url: sourceUrl,
    imageUrl: listing.imageUrl || "",
    status: "pending",
    attempts: 0,
    notes: "",
    dateAdded: new Date().toISOString(),
  };

  // Local Save + Sync
  const updated = [newItem, ...existing];
  localStorage.setItem("property_followups", JSON.stringify(updated));
  addNotification("success", `Added "${newItem.title}" to follow-ups!`);

  fetch(`${ process.env.NEXT_PUBLIC_API_URL}/api/v1/followups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newItem),
  }).catch((err) => console.warn("DB Sync delayed:", err));
};

// LocalStorage Keys
const GUMTREE_CACHE_KEY = "property_dashboard_gumtree_cache";
const RIGHTMOVE_CACHE_KEY = "property_dashboard_rightmove_cache";

// Inside DashboardPage component:

// Hydrate state from localStorage whenever 'source' changes
useEffect(() => {
  const cacheKey = source === "gumtree" ? GUMTREE_CACHE_KEY : RIGHTMOVE_CACHE_KEY;
  const savedCache = localStorage.getItem(cacheKey);

  if (savedCache) {
    try {
      const parsed = JSON.parse(savedCache);
      setListingData(parsed.listingData || []);
      setCurrentPage(parsed.currentPage || 1);
      setNumberOfPages(parsed.numberOfPages || 1);
      setStatus(parsed.listingData?.length > 0 ? "success" : "idle");

      // Restore Rightmove payload state if switching back to Rightmove
      if (source === "rightmove" && parsed.activeRmPayload) {
        setActiveRmPayload(parsed.activeRmPayload);
      }
    } catch (e) {
      console.error("Failed to parse cached data:", e);
    }
  } else {
    // Reset view gracefully if no cache exists for the selected source yet
    setListingData([]);
    setCurrentPage(1);
    setNumberOfPages(1);
    setStatus("idle");
  }
}, [source]);
// Cache active rightmove payload for pagination controls
// Inside page.tsx

// Active Rightmove search cache in dashboard state
const [activeRmPayload, setActiveRmPayload] = useState<RightmovePayload | null>(null);

/**
 * 1. GUMTREE FETCH LOGIC
 * Endpoints: GET /api/v1/property/gumtree (Page 1) 
 *            POST /api/v1/property/gumtree (Page > 1)
 * Pagination: Step increment by 1 (1, 2, 3...)
 */
const fetchGumtreeProperties = async (page: number = 1) => {
  if (isCoolingDown) {
    addNotification("error", `Please wait ${cooldownSeconds} second(s) before making another request.`);
    return;
  }

  const pageNum = typeof page === "number" ? page : 1;
  const isPost = pageNum > 1;

  setStatus("loading");
  startCooldownLock(10);

  try {
    const apiUrl =  process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}/api/v1/property/gumtree`;

    const fetchOptions: RequestInit = isPost
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: pageNum }),
        }
      : {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        };

    const response = await fetch(endpoint, fetchOptions);
    if (!response.ok) throw new Error(`Server status ${response.status}`);

    const result = await response.json();
    const innerData = result.data || {};
    const properties = Array.isArray(innerData) ? innerData : innerData.data || [];
    const pagination = result.pagination || innerData.pagination || {};

    const totalPages = Number(pagination.numberOfPages || 1);
    const activePage = Number(pagination.currentPage || pageNum);

    setListingData(properties);
    setCurrentPage(activePage);
    setNumberOfPages(totalPages);
    setStatus(properties.length > 0 ? "success" : "empty");

    // SAVE TO GUMTREE CACHE
    localStorage.setItem(
      GUMTREE_CACHE_KEY,
      JSON.stringify({
        listingData: properties,
        currentPage: activePage,
        numberOfPages: totalPages,
      })
    );
  } catch (error: any) {
    console.error("Gumtree Fetch Error:", error);
    setStatus("error");
  }
};

/**
 * 2. RIGHTMOVE FETCH LOGIC
 * Endpoint: POST /api/v1/property/rightmove
 * Pagination: Offset steps of 24 (0, 24, 48, 72...)
 */
const fetchRightmoveProperties = async (param: RightmovePayload | number) => {
  if (isCoolingDown) {
    addNotification("error", `Please wait ${cooldownSeconds} second(s) before making another request.`);
    return;
  }

  let pageToFetch = 1;
  let rmPayload: RightmovePayload | null = null;

  if (typeof param === "number") {
    pageToFetch = param;
    rmPayload = activeRmPayload;
  } else {
    pageToFetch = 1;
    rmPayload = param;
    setActiveRmPayload(param);
  }

  if (!rmPayload || !rmPayload.location || !rmPayload.regionId) return;

  setStatus("loading");
  startCooldownLock(10);

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const offsetIndex = ((pageToFetch - 1) * 24).toString();

    const response = await fetch(`${apiUrl}/api/v1/property/rightmove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: rmPayload.location,
        regionId: rmPayload.regionId,
        sinceAdded: rmPayload.sinceAdded || "14",
        pagination: offsetIndex,
      }),
    });

    if (!response.ok) throw new Error(`Server status ${response.status}`);

    const result = await response.json();
    const innerData = result.data || {};
    const properties = Array.isArray(innerData) ? innerData : innerData.data || [];
    const pagination = innerData.pagination || result.pagination || {};

    let totalPages = 1;
    if (Array.isArray(pagination.options) && pagination.options.length > 0) {
      totalPages = pagination.options.length;
    } else if (pagination.total) {
      totalPages = Math.ceil(Number(pagination.total) / 24);
    }

    setListingData(properties);
    setCurrentPage(pageToFetch);
    setNumberOfPages(totalPages);
    setStatus(properties.length > 0 ? "success" : "empty");

    // SAVE TO RIGHTMOVE CACHE
    localStorage.setItem(
      RIGHTMOVE_CACHE_KEY,
      JSON.stringify({
        listingData: properties,
        currentPage: pageToFetch,
        numberOfPages: totalPages,
        activeRmPayload: rmPayload,
      })
    );
  } catch (error: any) {
    console.error("Rightmove Error:", error);
    setStatus("error");
  }
};

  const handleNextImage = (listingIdx: number, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => ({ ...prev, [listingIdx]: ((prev[listingIdx] || 0) + 1) % totalImages }));
  };

  const handlePrevImage = (listingIdx: number, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => ({ ...prev, [listingIdx]: ((prev[listingIdx] || 0) - 1 + totalImages) % totalImages }));
  };

  const toggleDescription = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };
                  /**
   * 3. UNIFIED PAGINATION CONTROL HANDLER
   */
 const handlePageChange = (newPage: number) => {
  if (source === "gumtree") {
    fetchGumtreeProperties(newPage);
  } else {
    fetchRightmoveProperties(newPage);
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

      {/* Header Controls */}
      <div className="flex flex-col gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Property Explorer</h1>
            <p className="text-sm text-muted-foreground mt-1">Live aggregated private rental listings</p>
          </div>

          <SourceToggle 
            source={source} 
            onSourceChange={(newSource) => {
              setSource(newSource);
              setStatus("idle");
            }} 
          />
        </div>

       {/* RIGHTMOVE SECTION */}
{source === "rightmove" && (
  <RightmoveAutocompletion
    onFetchListings={(payload) => fetchRightmoveProperties(payload)}
    isLoadingListings={status === "loading"}
  />
)}

{/* GUMTREE SECTION */}
{source === "gumtree" && (
  <div className="flex justify-end pt-2 border-t">
    <Button 
      onClick={() => fetchGumtreeProperties(1)} 
      disabled={status === "loading"}
      className="px-6 h-11 text-base font-semibold shadow-md"
    >
      {status === "loading" ? (
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
      ) : (
        <Search className="h-5 w-5 mr-2" />
      )}
      Fetch Gumtree Listings
    </Button>
  </div>
)}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col space-y-4">
        {status === "idle" && (
          <div className="h-[450px] rounded-2xl border border-dashed bg-card/50 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Search className="h-12 w-12 opacity-20" />
            <p className="text-base font-medium">Ready to search. Select criteria and click &quot;Fetch Listings&quot;.</p>
          </div>
        )}

        {status === "loading" && (
          <div className="h-[450px] rounded-2xl border bg-card/50 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base font-semibold">Scraping and decoding live page elements...</p>
          </div>
        )}

        {status === "empty" && (
          <div className="h-[450px] rounded-2xl border bg-card/50 flex flex-col items-center justify-center space-y-3">
            <Database className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-xl font-semibold text-foreground">No Listings Found</p>
          </div>
        )}

        {status === "error" && (
          <div className="h-[450px] rounded-2xl border border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center space-y-3 text-rose-600">
            <AlertCircle className="h-12 w-12" />
            <p className="text-xl font-semibold">Connection Error</p>
          </div>
        )}

        {status === "success" && (
          <div className="grid grid-cols-1 gap-6">
            {listingData.map((item, index) => {
              const rowId = `listing-${index}-${item.id || index}`;
              const isExpanded = expandedDescriptions[rowId] || false;

              const title = item.title || item.displayAddress || "Untitled Property Listing";
              const descriptionText = item.shortDescription || item.summary || "No description provided.";
              
              let priceDisplay = "POA";
              if (item.price) {
                if (typeof item.price === "string") priceDisplay = item.price;
                else if (typeof item.price === "object") priceDisplay = `£${item.price.amount} ${item.price.frequency || "pcm"}`;
              }

              const locationText = item.location || item.displayAddress;
              const phoneNum = item.srpContactDetail?.replyPhone || item.customer?.contactTelephone;
              const listingUrl = item.url || item.propertyUrl;

              let images: string[] = [];
              if (item.imageUrl) images.push(item.imageUrl);
              if (Array.isArray(item.imageIds)) images.push(...item.imageIds.map((id: string) => `https://img.gumtree.com/ePR8PyKf84wPHx7_RYmEag/${id}/86`));
              if (Array.isArray(item.images)) images.push(...item.images.map((img: any) => img.srcUrl || img));
              if (images.length === 0) images = ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"];

              const currentImgIdx = carouselIndices[index] || 0;

              return (
                <div key={rowId} className="bg-card rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row">
                  <div className="relative md:w-80 h-64 md:h-72 bg-zinc-950 flex-shrink-0 group overflow-hidden flex items-center justify-center">
                    <img 
                      src={images[currentImgIdx]} 
                      alt={title} 
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"; }}
                    />
                    {images.length > 1 && (
                      <>
                        <button onClick={(e) => handlePrevImage(index, images.length, e)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => handleNextImage(index, images.length, e)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                          {currentImgIdx + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {listingUrl ? (
                          <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-2 group/link">
                            <span className="line-clamp-1">{title}</span>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-60 group-hover/link:opacity-100" />
                          </a>
                        ) : (
                          <h2 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">{title}</h2>
                        )}
                        <span className="text-2xl font-extrabold text-primary flex-shrink-0">{priceDisplay}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
                        {locationText && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-muted-foreground/70" />
                            <span>{locationText}</span>
                          </div>
                        )}
                        {(item.date || item.listingUpdate?.listingUpdateDate) && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground/70" />
                            <span>{new Date(Number(item.date) || item.listingUpdate?.listingUpdateDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <p className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!isExpanded ? 'line-clamp-3' : ''}`}>
                          {descriptionText}
                        </p>
                        {descriptionText.length > 80 && (
                          <button onClick={(e) => toggleDescription(rowId, e)} className="text-xs font-semibold text-primary mt-1.5 hover:underline block">
                            {isExpanded ? "See less" : "See more"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4">
                      <Button onClick={() => handleAddToFollowUp(item)} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs border-primary/40 hover:bg-primary/5 hover:text-primary">
                        <UserPlus className="h-3.5 w-3.5" /> Add to Follow-Up
                      </Button>

                      {phoneNum ? (
                        <a href={`tel:${phoneNum}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 hover:bg-emerald-100 text-sm">
                          <Phone className="h-4 w-4" /> {phoneNum}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No phone available</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
      {numberOfPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            disabled={currentPage <= 1 || status === "loading"}
            onClick={() => handlePageChange(currentPage - 1)}
            variant="outline"
          >
            Previous
          </Button>
          
          <span className="text-sm font-medium">
            Page {currentPage} of {numberOfPages}
          </span>

          <Button
            disabled={currentPage >= numberOfPages || status === "loading"}
            onClick={() => handlePageChange(currentPage + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}