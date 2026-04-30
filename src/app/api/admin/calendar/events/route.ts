export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { google } from "googleapis";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  try {
    const calendar = google.calendar({ version: "v3", auth: getAuth() });

    // Trae eventos desde hoy en adelante, ordenados por fecha
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      meetLink: e.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri,
      htmlLink: e.htmlLink,
      attendeesCount: e.attendees?.length ?? 0,
      status: e.status,
    }));

    return NextResponse.json({ events, calendarId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message.includes("403") || message.includes("scope") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
