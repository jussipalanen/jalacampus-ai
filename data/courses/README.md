# Synthetic course catalog

`courses.json` describes the courses of the **fictional** "JalaCampus-korkeakoulu". The course codes, names, credits, periods and descriptions were written for this repository as demo data and do not describe any real university. The file contains no personal data; courses list a unit, not a teacher.

The app validates the file when it loads (`parseCatalog` in `src/lib/courses.ts`), so a mistake fails `npm test` and `npm run build`:

| Field | Rule |
| --- | --- |
| `code` | Three capital letters and three digits, unique (e.g. `TIE210`) |
| `name`, `unit`, `description` | Non-empty text (Finnish; English-taught courses keep their English name) |
| `credits` | Whole number from 1 to 30 (opintopisteet) |
| `periods` | Ascending teaching periods from 1 to 4 |
| `language` | `fi`, `sv` or `en` |
| `level` | `basic` (perusopinnot), `intermediate` (aineopinnot) or `advanced` (syventävät opinnot) |
| `keywords` | Search words, e.g. common synonyms the name doesn't contain |
| `prerequisites` | Optional codes of other courses in this file |

`source` names the catalog. The API returns it with every response, and the **Kurssit** view shows it on every result.
