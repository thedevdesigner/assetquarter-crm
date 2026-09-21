"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";

interface Notification {
  id: number;
  type: "success" | "info" | "error";
  message: string;
}

export default function DashboardPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [listingData, setListingData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);

  // Notification state stack
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Carousel active image index map per listing item index
  const [carouselIndices, setCarouselIndices] = useState<Record<number, number>>({});

  // Expanded description state map per listing item
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const addNotification = (type: "success" | "info" | "error", message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Add listing to Follow-Up pipeline CRM
  const addToFollowUp = (item: any) => {
    const phone = item.srpContactDetail?.replyPhone || "";
    const id = item.id || phone || item.title;
    const listingUrl = item.url || item.sourceUrl || item.listingUrl || item.link || "";
    
    let imageUrl = item.imageUrl || "";
    if (!imageUrl && Array.isArray(item.imageIds) && item.imageIds.length > 0) {
      imageUrl = `https://img.gumtree.com/ePR8PyKf84wPHx7_RYmEag/${item.imageIds[0]}/86`;
    }

    const existingData = JSON.parse(localStorage.getItem("property_followups") || "[]");
    
    // Prevent duplicate entries based on ID or phone number
    const alreadyExists = existingData.some((f: any) => f.id === id || (phone && f.phone === phone));
    if (alreadyExists) {
      addNotification("info", "This listing is already in your follow-up pipeline!");
      return;
    }

    const newItem = {
      id,
      title: item.title || "Untitled Property",
      price: item.price || "POA",
      location: item.location || "",
      phone,
      url: listingUrl,
      imageUrl,
      dateAdded: new Date().toISOString(),
      status: "pending",
      attempts: 0,
      notes: ""
    };

    localStorage.setItem("property_followups", JSON.stringify([newItem, ...existingData]));
    addNotification("success", "Added to follow-up pipeline!");
  };

  // Fetch properties from backend API
  const fetchProperties = async (pageToFetch: number) => {
    setStatus("loading");
    addNotification("info", `Fetching listings for page ${pageToFetch}...`);
    
    try {
      let fetchOptions: RequestInit = {
        headers: { 'Content-Type': 'application/json' },
      };

      if (pageToFetch > 1) {
        fetchOptions.method = 'POST';
        fetchOptions.body = JSON.stringify({ page: pageToFetch });
      } else {
        fetchOptions.method = 'GET';
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gumtree-property-listing-london.onrender.com';
      const response = await fetch(`${apiUrl}/api/v1/property`, fetchOptions);
      const result = await response.json();
      
      console.log("Full API Result:", result);

      if (!result || !result.success) {
        throw new Error(result?.message || "Failed to fetch valid listing schema.");
      }

      // Read from the nested result.data structure
      const innerPayload = result.data || {};
      const properties = innerPayload.data || [];
      const pagination = innerPayload.pagination || { numberOfPages: 1, currentPage: pageToFetch };

      setNumberOfPages(pagination.numberOfPages || 1);
      setCurrentPage(pagination.currentPage || pageToFetch);

      if (!Array.isArray(properties) || properties.length === 0) {
        setListingData([]);
        setStatus("empty");
        addNotification("info", "No more listings found on this page.");
      } else {
        setStatus("success");
        setListingData(properties);
        setExpandedDescriptions({}); // Reset description states on new page
        addNotification("success", `Successfully loaded ${properties.length} listings!`);
      }
      
    } catch (error: any) {
      console.error("Data fetch failed:", error);
      setStatus("error");
      setListingData([]);
      addNotification("error", error?.message || "Communication error with your scraping backend.");
    }
  };

  // Carousel slide handlers
  const handleNextImage = (listingIdx: number, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => {
      const current = prev[listingIdx] || 0;
      const next = (current + 1) % totalImages;
      return { ...prev, [listingIdx]: next };
    });
  };

  const handlePrevImage = (listingIdx: number, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => {
      const current = prev[listingIdx] || 0;
      const prevIdx = (current - 1 + totalImages) % totalImages;
      return { ...prev, [listingIdx]: prevIdx };
    });
  };

  // Toggle description view state per card
  const toggleDescription = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full min-h-screen flex flex-col bg-background relative">
      
      {/* Toast Notification Container */}
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
            <div 
              key={n.id} 
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg transition-all transform translate-y-0 opacity-100 ${bgStyle}`}
            >
              <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium leading-tight">
                {n.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gumtree Property Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">Live aggregated private rental listings from London</p>
        </div>
        <Button 
          onClick={() => fetchProperties(1)} 
          disabled={status === "loading"}
          className="px-6 h-11 text-base font-semibold shadow-md"
        >
          {status === "loading" ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
          Fetch Listings
        </Button>
      </div>

      {/* Content Body Area */}
      <div className="flex-1 flex flex-col space-y-4">
        
        {status === "idle" && (
          <div className="h-[450px] rounded-2xl border border-dashed bg-card/50 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Search className="h-12 w-12 opacity-20" />
            <p className="text-base font-medium">Ready to search. Click &quot;Fetch Listings&quot; to begin parsing properties.</p>
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
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Page {currentPage} returned no valid property advertisements. Try shifting page criteria.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="h-[450px] rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 flex flex-col items-center justify-center space-y-3 text-rose-600">
            <AlertCircle className="h-12 w-12" />
            <p className="text-xl font-semibold">Connection Error</p>
            <p className="text-sm max-w-sm text-center">There was an issue communicating with your scraping server or processing payload elements.</p>
          </div>
        )}

        {status === "success" && (
          <div className="grid grid-cols-1 gap-6">
            {listingData.map((item, index) => {
              const rowId = `listing-${index}-${item.id || index}`;
              const phoneNum = item.srpContactDetail?.replyPhone;
              const isExpanded = expandedDescriptions[rowId] || false;
              const descriptionText = item.shortDescription || "No detailed description provided for this listing.";
              
              const listingUrl = item.url || item.sourceUrl || item.listingUrl || item.link;

              // Handle image setup
              let images: string[] = [];
              if (item.imageUrl) {
                images = [item.imageUrl];
              }
              if (Array.isArray(item.imageIds) && item.imageIds.length > 0) {
                images = item.imageIds.map((id: string) => `https://img.gumtree.com/ePR8PyKf84wPHx7_RYmEag/${id}/86`);
              }
              if (images.length === 0) {
                images = ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"];
              }

              const currentImgIdx = carouselIndices[index] || 0;

              return (
                <div 
                  key={rowId} 
                  className="bg-card rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Left Side: Image Carousel Container */}
                  <div className="relative md:w-80 h-64 md:h-72 bg-zinc-950 flex-shrink-0 group overflow-hidden flex items-center justify-center">
                    <img 
                      src={images[currentImgIdx]} 
                      alt={item.title || "Property Listing"} 
                      className="w-full h-full object-contain"
                      onError={(e)=>{
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600";
                      }}
                    />
                    
                    {images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => handlePrevImage(index, images.length, e)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => handleNextImage(index, images.length, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                          {currentImgIdx + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Side: Details Information Card Layout */}
                  <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {listingUrl ? (
                          <a 
                            href={listingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-2 group/link"
                            title="Click to verify original listing on Gumtree"
                          >
                            <span className="line-clamp-1">{item.title || "Untitled Property Listing"}</span>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-60 group-hover/link:opacity-100" />
                          </a>
                        ) : (
                          <h2 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                            {item.title || "Untitled Property Listing"}
                          </h2>
                        )}
                        <span className="text-2xl font-extrabold text-primary flex-shrink-0">
                          {item.price ? `${item.price}` : 'POA'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
                        {item.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-muted-foreground/70" />
                            <span>{item.location}</span>
                          </div>
                        )}
                        {item.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground/70" />
                            <span>{new Date(Number(item.date)).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <p className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!isExpanded ? 'line-clamp-3' : ''}`}>
                          {descriptionText}
                        </p>
                        {descriptionText.length > 80 && (
                          <button
                            onClick={(e) => toggleDescription(rowId, e)}
                            className="text-xs font-semibold text-primary mt-1.5 hover:underline focus:outline-none block"
                          >
                            {isExpanded ? "See less" : "See more"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action footer inside card */}
                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Button 
                          onClick={() => addToFollowUp(item)}
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 font-semibold text-xs border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Add to Follow-Up
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        {phoneNum ? (
                          <a 
                            href={`tel:${phoneNum}`} 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors text-sm"
                          >
                            <Phone className="h-4 w-4" />
                            {phoneNum}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No phone available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls footer */}
        {status === "success" && (
          <div className="flex items-center justify-between pt-4 border-t mt-6 bg-card p-4 rounded-2xl border shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Page <span className="text-foreground font-bold">{currentPage}</span> of <span className="text-foreground font-bold">{numberOfPages}</span>
            </p>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1}
                onClick={() => fetchProperties(currentPage - 1)}
                className="h-9 px-4 font-semibold"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= numberOfPages}
                onClick={() => fetchProperties(currentPage + 1)}
                className="h-9 px-4 font-semibold"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}