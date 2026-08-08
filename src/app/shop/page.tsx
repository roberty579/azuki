import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <ComingSoon
      title="Shop"
      blurb="Ready-made pieces, available now."
    />
  );
}
