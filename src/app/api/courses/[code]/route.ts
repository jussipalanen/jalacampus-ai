import { courseCatalog } from "@/lib/course-catalog";
import { handleCourseLookup } from "@/lib/courses-api";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return handleCourseLookup((await params).code, courseCatalog);
}
