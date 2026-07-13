import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 animate-fade-in">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-400 text-lg max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
