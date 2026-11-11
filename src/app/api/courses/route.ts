import { courseCatalog } from "@/lib/course-catalog";
import { handleCourseSearch } from "@/lib/courses-api";

export function GET(request: Request) {
  return handleCourseSearch(request, courseCatalog);
}
