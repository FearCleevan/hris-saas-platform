'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/ui/FormField';
import { contactFormSchema, type ContactFormData } from '@/lib/demo-schema';
import { cn } from '@/lib/utils';

const INQUIRY_TYPES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'sales', label: 'Sales / Pricing' },
  { value: 'support', label: 'Technical Support' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'partnership', label: 'Partnership / Integration' },
];

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({ resolver: zodResolver(contactFormSchema) });

  const onSubmit = async (data: ContactFormData) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    console.log('[Contact Form Submitted]', data);
    setSubmitting(false);
    setSubmitted(true);
    toast.success('Message sent!', {
      description: "We'll get back to you within 1 business day.",
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">Message received!</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ll get back to you within 1 business day (Mon–Fri, 8AM–6PM PHT).
          </p>
        </div>
        <Button variant="outline" onClick={() => { setSubmitted(false); reset(); }}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormField
        id="name"
        label="Full Name"
        required
        placeholder="Juan dela Cruz"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="email"
          label="Email Address"
          required
          type="email"
          placeholder="juan@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          id="phone"
          label="Phone Number (Optional)"
          placeholder="+63 917 123 4567"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type" className="text-sm font-medium">
          Inquiry Type <span className="text-[#ce1126]">*</span>
        </Label>
        <Select onValueChange={(v) => setValue('type', v as ContactFormData['type'])}>
          <SelectTrigger id="type" className={cn(errors.type && 'border-[#ce1126]')}>
            <SelectValue placeholder="Select inquiry type" />
          </SelectTrigger>
          <SelectContent>
            {INQUIRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-[#ce1126]">{errors.type.message}</p>}
      </div>

      <FormField
        id="subject"
        label="Subject"
        required
        placeholder="Question about SSS compliance setup"
        error={errors.subject?.message}
        {...register('subject')}
      />

      <FormField
        id="message"
        label="Message"
        required
        as="textarea"
        placeholder="Tell us how we can help you..."
        rows={5}
        error={errors.message?.message}
        {...register('message')}
      />

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#0038a8] hover:bg-[#002580] text-white font-semibold h-11 gap-2"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="h-4 w-4" /> Send Message</>
        )}
      </Button>
    </form>
  );
}
