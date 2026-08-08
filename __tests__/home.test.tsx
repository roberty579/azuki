import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { site } from "@/content/site";

describe("Home page", () => {
  test("[HOME-5] leads with the business name as the page heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: site.name }),
    ).toBeInTheDocument();
  });

  test("[HOME-6] shows the about blurb", () => {
    render(<Home />);

    expect(screen.getByText(site.about)).toBeInTheDocument();
  });

  test("[HOME-8] links to every social account", () => {
    render(<Home />);

    for (const social of site.socials) {
      const link = screen.getByRole("link", { name: social.label });
      expect(link).toHaveAttribute("href", social.href);
      expect(link).toHaveAttribute("target", "_blank");
      // Protects the opener from the new tab; also silences tabnabbing warnings.
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("[HOME-8] offers the contact email as a mailto link", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: site.email })).toHaveAttribute(
      "href",
      `mailto:${site.email}`,
    );
  });

  test("[HOME-9] renders one gallery figure per item, each with alt text", () => {
    render(<Home />);

    const gallery = screen.getByRole("region", { name: /recent work/i });
    const images = within(gallery).getAllByRole("img");

    expect(images).toHaveLength(site.gallery.length);

    site.gallery.forEach((item, index) => {
      expect(images[index]).toHaveAccessibleName(item.alt);
      expect(within(gallery).getByText(item.title)).toBeInTheDocument();
    });
  });

  test("[HOME-7] points visitors at the scheduling and shop sections", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /book a consultation/i }),
    ).toHaveAttribute("href", "/schedule");
    expect(
      screen.getByRole("link", { name: /browse the shop/i }),
    ).toHaveAttribute("href", "/shop");
  });
});
