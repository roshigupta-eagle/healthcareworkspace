"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HashBookingRedirectClient() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash || '';
    if (h.includes('book')) {
      // replace the current history entry with the dedicated booking page
      router.replace('/dashboard/appointments/book');
    }
  }, [router]);
  return null;
}
