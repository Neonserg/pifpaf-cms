import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages, blocks, media } from "@/lib/db/schema";
import PagesManager from "./pages-manager";

export default async function PagesAdminPage() {
  const [pagesRows, blocksRows, mediaRows] = await Promise.all([
    db.select().from(pages).orderBy(asc(pages.sort_order)),
    db.select().from(blocks).orderBy(asc(blocks.sort_order)),
    db.select().from(media).orderBy(desc(media.created_at)),
  ]);

  return <PagesManager initialPages={pagesRows} initialBlocks={blocksRows} initialMedia={mediaRows} />;
}
