import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { forms, pages, form_submissions } from "@/lib/db/schema";
import FormsManager from "./forms-manager";

export default async function FormsPage() {
  const [formsRows, pagesRows, submissionsRows] = await Promise.all([
    db.select().from(forms).orderBy(asc(forms.created_at)),
    db.select().from(pages).where(eq(pages.type, "content")).orderBy(asc(pages.title)),
    db.select().from(form_submissions).orderBy(desc(form_submissions.created_at)),
  ]);

  return (
    <FormsManager
      initialForms={formsRows}
      initialPages={pagesRows}
      initialSubmissions={submissionsRows}
    />
  );
}
