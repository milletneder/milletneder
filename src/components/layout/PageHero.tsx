import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  stats?: { label: string; value: string | number }[];
}

export default function PageHero({ title, subtitle, backLink, stats }: PageHeroProps) {
  return (
    <div className="mb-10">
      {backLink && (
        <Link href={backLink.href} className="text-xs text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 transition-colors">
          <ArrowLeft className="size-3" />
          {backLink.label}
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
      {stats && stats.length > 0 && (
        <>
          <Separator className="mt-6 mb-6" />
          <div className="flex flex-wrap items-center gap-6">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-6">
                {i > 0 && <Separator orientation="vertical" className="h-8" />}
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">{stat.label}</span>
                  <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
