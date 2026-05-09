import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

const CMS_PATHS = [
  "/",
  "/advisory",
  "/masterclasses",
  "/live-interviews",
  "/rockstars",
  "/qa",
  "/house-rules",
];

export async function GET() {
  for (const path of CMS_PATHS) {
    revalidatePath(path);
  }
  return NextResponse.json({ revalidated: true, paths: CMS_PATHS, ts: Date.now() });
}
