import { site } from "@/content/site";

/**
 * Social accounts plus the contact email.
 *
 * @implements HOME-8 — external links open in a new tab and carry
 *   rel="noopener noreferrer"; the address renders as a mailto: link.
 */
export default function SocialLinks() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
        Find us
      </h2>

      <ul className="flex flex-wrap gap-3">
        {site.socials.map((social) => (
          <li key={social.href}>
            <a
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {social.label}
            </a>
          </li>
        ))}
      </ul>

      <p className="text-base text-ink-muted">
        Questions or a project in mind?{" "}
        <a
          href={`mailto:${site.email}`}
          className="font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {site.email}
        </a>
      </p>
    </div>
  );
}
