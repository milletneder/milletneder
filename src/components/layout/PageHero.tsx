import Link from 'next/link';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  stats?: { label: string; value: string | number }[];
}

export default function PageHero({ title, subtitle, backLink, stats }: PageHeroProps) {
  const isCompact = stats && stats.length >= 4;

  return (
    <div className="mb-10">
      {backLink && (
        <Link href={backLink.href} className="text-xs text-neutral-400 hover:text-black mb-4 inline-block">
          &larr; {backLink.label}
        </Link>
      )}
      <h1 className="text-2xl font-black text-black">{title}</h1>
      {subtitle && (
        <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>
      )}
      {stats && stats.length > 0 && (
        <div className={`flex flex-wrap items-center mt-6 pt-6 border-t border-neutral-100 ${isCompact ? 'gap-4 sm:gap-5' : 'gap-6'}`}>
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-4 sm:gap-5">
              {i > 0 && <div className={`w-px bg-neutral-100 ${isCompact ? 'h-6' : 'h-8'}`} />}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">{stat.label}</span>
                <span className={`font-bold text-black tabular-nums ${isCompact ? 'text-lg' : 'text-2xl'}`}>{stat.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
