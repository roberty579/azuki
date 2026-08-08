import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = { title: "Build a Bunny" };

export default function BuildABunnyPage() {
  return (
    <ComingSoon
      title="Build a Bunny"
      blurb="Pick a bunny, choose colors, and add accessories to make it yours."
    />
  );
}
