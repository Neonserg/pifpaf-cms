import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import MediaLibrary from "./media-library";

export default async function MediaAdminPage() {
  const mediaRows = await db.select().from(media).orderBy(desc(media.created_at));
  return <MediaLibrary initialMedia={mediaRows} />;
}
