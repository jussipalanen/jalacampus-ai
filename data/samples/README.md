# Synthetic sample documents

These Finnish texts describe services of a **fictional** institution, "JalaCampus-korkeakoulu". They were written for this repository as demo data. Names, opening hours, fees, dates and rules are invented and do not describe any real university. They contain no personal data.

Load them with:

```bash
npm run db:ingest -- data/samples
```

Ingestion sends the text to the Gemini API for embeddings when `GEMINI_API_KEY` is set. Only add documents here that are synthetic or appropriately licensed for public use.
