import raw from "../../data/courses/courses.json" with { type: "json" };
import { parseCatalog } from "./courses.ts";

/**
 * The synthetic course catalog bundled with the app. It is validated when this module loads,
 * so a malformed data file fails the build and the tests instead of serving partial data.
 */
export const courseCatalog = parseCatalog(raw);
