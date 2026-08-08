import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = { title: "Forms/Commissions" };

export default function CommissionPage() {
  return (
    <ComingSoon
      title="Forms/Commissions"
      blurb="Request a custom piece: yarn, colors, sizing, and fulfillment details."
    />
  );
}
