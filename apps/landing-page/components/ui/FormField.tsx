import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  id: string;
}

type InputFieldProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };

type TextareaFieldProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type FormFieldProps = InputFieldProps | TextareaFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, error, required, className, id, as, ...rest } = props;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-[#ce1126] ml-1">*</span>}
      </Label>
      {as === 'textarea' ? (
        <Textarea
          id={id}
          className={cn(error && 'border-[#ce1126] focus-visible:ring-[#ce1126]')}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          id={id}
          className={cn(error && 'border-[#ce1126] focus-visible:ring-[#ce1126]')}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-xs text-[#ce1126]">{error}</p>}
    </div>
  );
}
