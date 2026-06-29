"use client";

import { useRouter } from "next/navigation";
import { ChatForm } from "@/components/apply/chat-form";

export default function HomePage() {
  const router = useRouter();
  return <ChatForm onSuccess={() => router.push("/apply/success")} />;
}
