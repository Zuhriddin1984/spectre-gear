'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ links }: { links: [string, string][] }) {
  const path = usePathname();
  return (
    <nav className="main">
      {links.map(([href, label]) => {
        const on = href === '/' ? path === '/' || path.startsWith('/items') : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''}>{label}</Link>;
      })}
    </nav>
  );
}
