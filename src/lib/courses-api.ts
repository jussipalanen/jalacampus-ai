import { errorResponse } from "./api-request.ts";
import { MAX_COURSE_QUERY_LENGTH, findCourse, searchCourses, type CourseCatalog } from "./courses.ts";

/**
 * Framework-independent handler for GET /api/courses?q=&period=. Results come only from the catalog,
 * never from a language model, and the response names the catalog as their source.
 */
export function handleCourseSearch(request: Request, catalog: CourseCatalog): Response {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim();
  if (Array.from(query).length > MAX_COURSE_QUERY_LENGTH) {
    return errorResponse(`Hakusanan enimmäispituus on ${MAX_COURSE_QUERY_LENGTH} merkkiä.`, 400);
  }
  const periodParam = params.get("period") || null;
  if (periodParam !== null && !/^[1-4]$/.test(periodParam)) return errorResponse("Periodin tulee olla 1, 2, 3 tai 4.", 400);
  const period = periodParam === null ? undefined : Number(periodParam);

  const results = searchCourses(catalog, query, { period }).map(match => match.course);
  return Response.json({ source: catalog.source, query, period: period ?? null, total: catalog.courses.length, results });
}

/** Handler for GET /api/courses/{code}: one course with its source, or a Finnish 404. */
export function handleCourseLookup(code: string, catalog: CourseCatalog): Response {
  const course = findCourse(catalog, code);
  if (!course) return errorResponse("Kurssia ei löytynyt.", 404, "not_found");
  return Response.json({ source: catalog.source, course });
}
