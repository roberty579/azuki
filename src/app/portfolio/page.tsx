import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <ComingSoon
      title="Portfolio"
      blurb="Past work across clothes and plushies, with yarn and designer credits."
    />
  );
}
