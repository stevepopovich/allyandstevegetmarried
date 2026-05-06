# Ally & Steve — wedding site

Static wedding site for Netlify with a serverless RSVP that reads an invite list from Google Sheets and upserts responses on a second tab.

## Google Sheet setup

Create one spreadsheet with **two tabs** (names can be overridden via environment variables).

### Tab: `Invites` (invite list — source of truth for names)

| Row 1 (header) | Column A (`FullName`) |
| --- | --- |
| `FullName` | *(example)* Jane Q. Guest |

- Put **one full name per row** starting in row 2 (row 1 is the header).
- The function reads the column configured by `INVITE_COLUMN` (default **`A`**).
- Matching is **case-insensitive**, **trimmed**, and **internal spaces collapsed**; the **exact** normalized string must match a row.

### Tab: `RSVPs` (responses)

| Column A | Column B | Column C |
| --- | --- | --- |
| `FullName` | `Attending` | `UpdatedAt` |

- Row 1 must be these **exact headers**: `FullName`, `Attending`, `UpdatedAt`.
- `Attending` is stored as **`yes`** or **`no`**.
- `UpdatedAt` is an **ISO 8601** timestamp (UTC).
- Resubmitting **overwrites** the row for the same guest (matched the same way as invites). No history is kept.

Share the spreadsheet with the service account email from your JSON key (e.g. `something@project.iam.gserviceaccount.com`) as **Editor**.

## Netlify environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | Yes | Spreadsheet ID from the Google Sheets URL. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | One of two | Full JSON for the GCP service account key (single-line or pasted JSON). |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | One of two | Same JSON, **base64-encoded** (useful when newlines/special chars are awkward in the Netlify UI). |
| `INVITE_SHEET_NAME` | No | Tab name for invites. Default: `Invites`. |
| `INVITE_COLUMN` | No | Column letter for the full-name column on the invite tab. Default: `A`. |
| `RSVP_SHEET_NAME` | No | Tab name for RSVPs. Default: `RSVPs`. |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated list of allowed `Origin` values for CORS (e.g. `https://your-site.netlify.app,https://yourdomain.com`). If unset, the function reflects the request `Origin` or uses `*`, which is convenient for local dev but **should be locked down in production**. |
| `SITE_ORIGIN` | No | Single allowed origin URL (no commas). If you need more than one site, use `ALLOWED_ORIGINS` instead. |

Do **not** commit secrets. This repo ignores `.env` and common key filenames (see `.gitignore`).

## Local development

```bash
npm install
cp .env.example .env
# Edit .env with your values (optional for UI-only testing)
npm run dev
```

- Site: the URL `netlify dev` prints (often `http://localhost:8888`).
- RSVP function: `POST http://localhost:8888/.netlify/functions/rsvp` with JSON `{ "name": "Jane Q. Guest", "attending": true }`.

## Deploy

Connect the repo to Netlify. Build settings are in `netlify.toml`:

- **Publish directory:** `public`
- **Functions directory:** `netlify/functions`
- **Node:** 18+ (set `NODE_VERSION` in Netlify site settings if needed)

## RSVP API (for reference)

- **Method:** `POST`
- **Body:** `{ "name": string, "attending": boolean }`
- **Success:** `200` with `{ ok: true, name, attending, updatedAt }`
- **Unknown name:** `404` with a generic error message (same for all non-matches)
