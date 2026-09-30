"use server";

import { db } from "@/db";
import { followUpsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. Add or toggle a property in follow-ups
export async function saveFollowUp(data: {
  id: string;
  title: string;
  price: string;
  location: string;
  phone: string;
  url: string;
  description: string,
  imageUrl: string;
  status?: string;
  notes?: string;
  dateAdded: string;
}) {
  try {
    await db.insert(followUpsTable).values({
      id: data.id,
      title: data.title,
      price: data.price || "",
      location: data.location || "",
      phone: data.phone || "",
      url: data.url || "",
      imageUrl: data.imageUrl || "",
      status: data.status || "pending",
      notes: data.notes || "",
      dateAdded: data.dateAdded,
    }).onConflictDoUpdate({
      target: followUpsTable.id,
      set: {
        status: data.status || "pending",
      },
    });
    
    revalidatePath("/dashboard/follow-ups");
    revalidatePath("/dashboard/performance");
    return { success: true };
  } catch (error) {
    console.error("Failed to save to Turso:", error);
    return { success: false, error: "Database error" };
  }
}

// 2. Fetch all tracked follow-ups from Turso
export async function getFollowUps() {
  try {
    return await db.select().from(followUpsTable);
  } catch (error) {
    console.error("Failed to fetch from Turso:", error);
    return [];
  }
}

// 3. Update status & add feedback notes
export async function updateFollowUpDetails(id: string, status: string, notes: string) {
  try {
    await db.update(followUpsTable)
      .set({ status, notes })
      .where(eq(followUpsTable.id, id));

    revalidatePath("/dashboard/follow-ups");
    revalidatePath("/dashboard/performance");
    return { success: true };
  } catch (error) {
    console.error("Failed to update follow-up details:", error);
    return { success: false, error: "Database error" };
  }
}