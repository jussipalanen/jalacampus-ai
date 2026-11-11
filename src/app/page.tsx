import { AppShell } from "@/components/app-shell";
import { courseCatalog } from "@/lib/course-catalog";
import { searchCourses } from "@/lib/courses";
import { structuredData } from "@/lib/site";

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
  // "<" is escaped so catalog text can never close the script element.
  const jsonLd = JSON.stringify(structuredData()).replace(/</g, "\\u003c");
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    <AppShell initialCourses={initialCourses} />
  </>;
}
