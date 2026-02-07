import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-gray-800/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="px-4 py-2 rounded-full bg-green-600 text-sm font-medium hover:bg-green-500 transition"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
