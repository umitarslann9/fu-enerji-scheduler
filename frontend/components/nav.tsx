'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/teachers', label: 'Öğretmenler' },
  { href: '/classrooms', label: 'Sınıflar' },
  { href: '/subjects', label: 'Dersler' },
  { href: '/schedule', label: 'Program' },
  { href: '/teacher-schedule', label: 'Öğretmen Prog.' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">Fu Enerji Scheduler</span>
          <nav className="flex items-center gap-0.5">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  pathname === link.href
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
