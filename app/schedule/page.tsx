import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Schedule"
      blurb="Book a consultation call to talk through your project."
    />
  );
}
