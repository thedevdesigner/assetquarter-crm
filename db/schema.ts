import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const followUpsTable = sqliteTable("follow_ups", {
  id: text("id").primaryKey(), // using unique string/UUID IDs
  title: text("title").notNull(),
  price: text("price"),
  location: text("location"),
  phone: text("phone"),
  url: text("url"),
  imageUrl: text("image_url"),
  description:text("description"),
  status: text("status").notNull().default("pending"), // pending, called, contacted, interested, viewing_booked, sa_friendly
  notes: text("notes"),
  dateAdded: text("date_added").notNull(), // ISO string for date matching
});