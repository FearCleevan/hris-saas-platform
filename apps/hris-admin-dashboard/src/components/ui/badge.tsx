import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#0038a8] text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        destructive: 'border-transparent bg-[#ce1126] text-white',
        outline: 'text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-600',
        success: 'border-transparent bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
        warning: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
