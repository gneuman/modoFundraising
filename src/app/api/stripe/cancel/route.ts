import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { cancelSubscription } from "@/lib/stripe";
import {
  getAllApplications,
  updateApplicationStatus,
  updateStartupStatus,
  deactivateAllFoundersForApplication,
} from "@/lib/airtable";
import { sendChurnEmail } from "@/lib/resend";

export async function POST() {
  const session = await obtenerSesion();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session.email);
  if (!app?.stripe_subscription_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await cancelSubscription(app.stripe_subscription_id);

  const startupIds = (app.startup_record as string[] | undefined) ?? [];
  await Promise.all([
    updateApplicationStatus(app.id!, "Churn", { portal_access: false }),
    deactivateAllFoundersForApplication(app.id!),
    startupIds[0] ? updateStartupStatus(startupIds[0], "Churn") : Promise.resolve(),
  ]);

  await sendChurnEmail(app.email!, app.first_name!);

  return NextResponse.json({ success: true });
}
