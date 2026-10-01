// Types matching your follow-up records
export interface FollowUpItem {
  id: string;
  title: string;
  price: string;
  location: string;
  phone: string;
  url: string;
  imageUrl: string;
  dateAdded: string;
  status: "pending" | "contacted" | "converted" | "rejected";
  attempts: number;
  notes: string;
}

export const FOLLOWUPS_CACHE_KEY = "property_followups_cache";

/**
 * Reads local cache, returns empty array if missing/corrupt
 */
export const getLocalFollowUps = (): FollowUpItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(FOLLOWUPS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading follow-ups cache:", e);
    return [];
  }
};

/**
 * Saves current array state directly to localStorage
 */
export const setLocalFollowUps = (items: FollowUpItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLLOWUPS_CACHE_KEY, JSON.stringify(items));
};

/**
 * Normalizes Gumtree or Rightmove card data into unified FollowUpItem
 */
export const normalizeToFollowUp = (rawItem: any, source: "gumtree" | "rightmove"): FollowUpItem => {
  if (source === "gumtree") {
    return {
      id: String(rawItem.id || rawItem.phone || crypto.randomUUID()),
      title: rawItem.title || rawItem.name || "Gumtree Property",
      price: rawItem.price || rawItem.formattedPrice || "POA",
      location: rawItem.location?.name || rawItem.location || "UK",
      phone: rawItem.phone || rawItem.contactPhone || "",
      url: rawItem.url ? (rawItem.url.startsWith("http") ? rawItem.url : `https://www.gumtree.com${rawItem.url}`) : "",
      imageUrl: rawItem.image || rawItem.imageUrl || rawItem.images?.[0] || "",
      status: "pending",
      attempts: 0,
      notes: "",
      dateAdded: new Date().toISOString(),
    };
  }

  // Rightmove Structure
  return {
    id: String(rawItem.id || rawItem.idNumber || crypto.randomUUID()),
    title: rawItem.propertyTypeFullDescription || rawItem.title || "Rightmove Property",
    price: rawItem.price?.amount ? `£${rawItem.price.amount}` : rawItem.price || "POA",
    location: rawItem.displayAddress || rawItem.location || "UK",
    phone: rawItem.customer?.contactTelephone || rawItem.phone || "",
    url: rawItem.propertyUrl ? `https://www.rightmove.co.uk${rawItem.propertyUrl}` : rawItem.url || "",
    imageUrl: rawItem.propertyImages?.mainImageSrc || rawItem.images?.[0]?.src || rawItem.imageUrl || "",
    status: "pending",
    attempts: 0,
    notes: "",
    dateAdded: new Date().toISOString(),
  };
};