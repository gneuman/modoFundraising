"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/analytics";

export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
