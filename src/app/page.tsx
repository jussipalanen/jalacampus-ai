import { AppShell } from "@/components/app-shell";
import { courseCatalog } from "@/lib/course-catalog";
import { searchCourses } from "@/lib/courses";

export default function Home() {
  // The whole catalog is rendered into the HTML, so Kurssit opens without waiting for the API
  // and the course information is readable without JavaScript.
  const initialCourses = {
    source: courseCatalog.source,
    query: "",
    period: null,
    total: courseCatalog.courses.length,
    results: searchCourses(courseCatalog, "").map(match => match.course),
  };
  return <AppShell initialCourses={initialCourses} />;
}
