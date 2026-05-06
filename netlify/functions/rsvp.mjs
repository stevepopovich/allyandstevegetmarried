import { google } from "googleapis";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.SITE_ORIGIN || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveCorsOrigin(requestOrigin) {
  const allowed = getAllowedOrigins();
  if (!allowed.length) {
    return requestOrigin || "*";
  }
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowed[0];
}

function corsHeaders(requestOrigin) {
  const origin = resolveCorsOrigin(requestOrigin);
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(status, body, requestOrigin) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(requestOrigin),
    },
    body: JSON.stringify(body),
  };
}

function loadServiceAccountCredentials() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    return JSON.parse(raw);
  }
  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_B64");
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const UNKNOWN_GUEST_MESSAGE =
  "We could not find that name on our guest list. Please check spelling, or text the hosts to be added.";

function getSheetsClient() {
  const credentials = loadServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [SHEETS_SCOPE],
  });
  return google.sheets({ version: "v4", auth });
}

export async function handler(event) {
  const requestOrigin = event.headers.origin || event.headers.Origin || "";

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(requestOrigin),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, requestOrigin);
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const inviteSheetName = process.env.INVITE_SHEET_NAME || "Invites";
  const inviteColumn = (process.env.INVITE_COLUMN || "A").trim();
  const rsvpSheetName = process.env.RSVP_SHEET_NAME || "RSVPs";

  if (!spreadsheetId) {
    console.error("Missing GOOGLE_SHEET_ID");
    return jsonResponse(500, { error: "Server configuration error" }, requestOrigin);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, requestOrigin);
  }

  const nameRaw = payload.name;
  const attending = payload.attending;

  if (typeof nameRaw !== "string" || !normalizeName(nameRaw)) {
    return jsonResponse(400, { error: "Please enter your full name as it appears on your invitation." }, requestOrigin);
  }
  if (typeof attending !== "boolean") {
    return jsonResponse(400, { error: "Please choose whether you are coming." }, requestOrigin);
  }

  const sheets = getSheetsClient();
  const inviteRange = `${inviteSheetName}!${inviteColumn}:${inviteColumn}`;

  let inviteRes;
  try {
    inviteRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: inviteRange,
    });
  } catch (err) {
    console.error("Invite sheet read failed", err);
    return jsonResponse(500, { error: "Could not read guest list. Try again later." }, requestOrigin);
  }

  const inviteRows = inviteRes.data.values || [];
  const normalizedInput = normalizeName(nameRaw);
  let canonicalName = null;

  for (const row of inviteRows) {
    const cell = row && row[0];
    if (cell == null || String(cell).trim() === "") continue;
    if (normalizeName(cell) === normalizedInput) {
      canonicalName = String(cell).replace(/\s+/g, " ").trim();
      break;
    }
  }

  if (!canonicalName) {
    return jsonResponse(404, { error: UNKNOWN_GUEST_MESSAGE }, requestOrigin);
  }

  const attendingCell = attending ? "yes" : "no";
  const updatedAt = new Date().toISOString();

  let rsvpRead;
  try {
    rsvpRead = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${rsvpSheetName}!A:A`,
    });
  } catch (err) {
    console.error("RSVP sheet read failed", err);
    return jsonResponse(500, { error: "Could not update RSVP. Try again later." }, requestOrigin);
  }

  const nameColumn = rsvpRead.data.values || [];
  let targetRow = -1;
  for (let i = 0; i < nameColumn.length; i++) {
    const cell = nameColumn[i] && nameColumn[i][0];
    if (cell != null && normalizeName(cell) === normalizeName(canonicalName)) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [[canonicalName, attendingCell, updatedAt]];

  try {
    if (targetRow > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${rsvpSheetName}!A${targetRow}:C${targetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rowValues },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${rsvpSheetName}!A:C`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: rowValues },
      });
    }
  } catch (err) {
    console.error("RSVP write failed", err);
    return jsonResponse(500, { error: "Could not save RSVP. Try again later." }, requestOrigin);
  }

  return jsonResponse(
    200,
    {
      ok: true,
      name: canonicalName,
      attending: attendingCell,
      updatedAt,
    },
    requestOrigin
  );
}
