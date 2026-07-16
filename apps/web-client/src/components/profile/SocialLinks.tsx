interface SocialLinksProps {
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  discord?: string | null;
}

function normalizeUrl(value: string, base: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${base}${value.replace(/^@/, '')}`;
}

export function SocialLinks({ website, twitter, instagram, discord }: SocialLinksProps) {
  const links = [
    website && { label: 'Website', href: normalizeUrl(website, 'https://') },
    twitter && { label: 'Twitter', href: normalizeUrl(twitter, 'https://twitter.com/') },
    instagram && { label: 'Instagram', href: normalizeUrl(instagram, 'https://instagram.com/') },
    discord && { label: 'Discord', href: discord.startsWith('http') ? discord : undefined, text: discord },
  ].filter(Boolean) as { label: string; href?: string; text?: string }[];

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) =>
        link.href ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="badge border border-brand-accent/30 text-brand-accent-deep bg-brand-accent/10 hover:bg-brand-accent/20 transition-colors"
          >
            {link.label}
          </a>
        ) : (
          <span
            key={link.label}
            className="badge border border-surface-border text-mist bg-surface-elevated"
          >
            {link.label}: {link.text}
          </span>
        ),
      )}
    </div>
  );
}
