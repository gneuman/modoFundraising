import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  // Callback de Google con el code → devuelve el refresh_token
  if (code) {
    const { tokens } = await auth.getToken(code);
    return NextResponse.json({
      message: "Guardá este valor en Vercel como GMAIL_REFRESH_TOKEN",
      refresh_token: tokens.refresh_token,
    });
  }

  // Sin code → redirigir a Google para autorizar
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
  return NextResponse.redirect(url);
}
