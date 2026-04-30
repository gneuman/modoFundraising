import { google } from "googleapis";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

export interface DriveRecording {
  id: string;
  name: string;
  createdTime: string;
  webViewLink: string;
  embedUrl: string;
  size?: string;
}

// Busca grabaciones de Google Meet en Drive
// Meet guarda los archivos con mimeType video/mp4 en la carpeta "Meet Recordings"
export async function getMeetRecordings(sinceDate?: string): Promise<DriveRecording[]> {
  const drive = google.drive({ version: "v3", auth: getAuth() });

  // Busca archivos de video creados por Meet (nombre empieza con el patrón de Meet)
  let query = `mimeType contains 'video/' and trashed = false and name contains 'Recording'`;
  if (sinceDate) {
    // sinceDate en formato YYYY-MM-DD
    query += ` and createdTime >= '${sinceDate}T00:00:00'`;
  }

  const res = await drive.files.list({
    q: query,
    fields: "files(id,name,createdTime,webViewLink,size)",
    orderBy: "createdTime desc",
    pageSize: 50,
  });

  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    createdTime: f.createdTime!,
    webViewLink: f.webViewLink!,
    embedUrl: `https://drive.google.com/file/d/${f.id}/preview`,
    size: f.size ?? undefined,
  }));
}

// Hace un archivo de Drive accesible para cualquiera con el link
export async function makeFilePublic(fileId: string): Promise<void> {
  const drive = google.drive({ version: "v3", auth: getAuth() });
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
}
