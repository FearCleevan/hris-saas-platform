'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/badge';
import { demoFormSchema, type DemoFormData } from '@/lib/demo-schema';
import { cn } from '@/lib/utils';

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const INDUSTRIES = [
  'Banking & Finance', 'BPO / IT Services', 'Food & Beverage', 'Healthcare',
  'Manufacturing', 'Real Estate', 'Retail', 'Telecommunications',
  'Transportation & Logistics', 'Other',
];
const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

type Step = 'form' | 'success';

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DemoFormData>({ resolver: zodResolver(demoFormSchema) });

  const onSubmit = async (data: DemoFormData) => {
    setSubmitting(true);
    // Mock submission — log to console (backend wired in Phase 2 of backend setup)
    await new Promise((r) => setTimeout(r, 1400));
    console.log('[Demo Request Submitted]', data);
    setSubmitting(false);
    setStep('success');
    toast.success('Demo request received!', {
      description: `We'll confirm your slot for ${data.preferredDate} at ${data.preferredTime} PHT.`,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setStep('form');
    }
    onOpenChange(open);
  };

  // Tomorrow as the min date
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0]!;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#0038a8] text-white text-xs">Free Demo</Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  No credit card required
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold">
                Book Your Personalized Demo
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                See HRISPH in action with a live walkthrough tailored to your industry and
                company size. Our PH compliance experts will guide you through payroll
                automation, SSS/PhilHealth/Pag-IBIG, and BIR TRAIN Law setup.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="firstName"
                  label="First Name"
                  required
                  placeholder="Juan"
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
                <FormField
                  id="lastName"
                  label="Last Name"
                  required
                  placeholder="dela Cruz"
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>

              {/* Company & email */}
              <FormField
                id="company"
                label="Company Name"
                required
                placeholder="Acme Corp Inc."
                error={errors.company?.message}
                {...register('company')}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="email"
                  label="Work Email"
                  required
                  type="email"
                  placeholder="juan@acmecorp.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <FormField
                  id="phone"
                  label="Phone Number"
                  required
                  placeholder="+63 917 123 4567"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              {/* Company size & industry */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="companySize" className="text-sm font-medium">
                    Company Size <span className="text-[#ce1126]">*</span>
                  </Label>
                  <Select onValueChange={(v) => setValue('companySize', v as DemoFormData['companySize'])}>
                    <SelectTrigger id="companySize" className={cn(errors.companySize && 'border-[#ce1126]')}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s} employees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companySize && (
                    <p className="text-xs text-[#ce1126]">{errors.companySize.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="industry" className="text-sm font-medium">
                    Industry <span className="text-[#ce1126]">*</span>
                  </Label>
                  <Select onValueChange={(v) => setValue('industry', v as DemoFormData['industry'])}>
                    <SelectTrigger id="industry" className={cn(errors.industry && 'border-[#ce1126]')}>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.industry && (
                    <p className="text-xs text-[#ce1126]">{errors.industry.message}</p>
                  )}
                </div>
              </div>

              {/* Date & time */}
              <div className="rounded-xl border border-[#0038a8]/20 bg-[#0038a8]/5 p-4 flex flex-col gap-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0038a8]" />
                  Preferred Demo Schedule (PHT)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="preferredDate"
                    label="Date"
                    required
                    type="date"
                    min={minDateStr}
                    error={errors.preferredDate?.message}
                    {...register('preferredDate')}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preferredTime" className="text-sm font-medium">
                      Time <span className="text-[#ce1126]">*</span>
                    </Label>
                    <Select onValueChange={(v) => setValue('preferredTime', v as DemoFormData['preferredTime'])}>
                      <SelectTrigger id="preferredTime" className={cn(errors.preferredTime && 'border-[#ce1126]')}>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>{t} PHT</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.preferredTime && (
                      <p className="text-xs text-[#ce1126]">{errors.preferredTime.message}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available Mon–Fri · 8:00 AM – 5:00 PM PHT · Sessions are 30–45 minutes
                </p>
              </div>

              {/* Optional message */}
              <FormField
                id="message"
                label="Anything specific you'd like to see? (Optional)"
                as="textarea"
                placeholder="e.g. We have 200 employees in multiple branches and need help with SSS compliance and BIR 2316 filing..."
                rows={3}
                {...register('message')}
              />

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-4">
                {['No credit card required', '30-min focused demo', 'PH compliance expert included', 'Cancel anytime'].map((t) => (
                  <span key={t} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" /> {t}
                  </span>
                ))}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0038a8] hover:bg-[#002580] text-white font-semibold h-11"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
                ) : (
                  'Book My Free Demo →'
                )}
              </Button>
            </form>
          </>
        ) : (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Demo Request Received!</h3>
              <p className="text-muted-foreground max-w-sm">
                Our team will confirm your demo slot within 1 business day. Check your email
                for a calendar invite.
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-5 text-sm text-left w-full max-w-sm flex flex-col gap-2">
              <p className="font-semibold text-foreground">What happens next?</p>
              {[
                '📧 Confirmation email with calendar invite',
                '📋 Pre-demo questionnaire (5 min)',
                '🎥 30-min live demo with PH compliance expert',
                '📞 Follow-up Q&A and custom proposal',
              ].map((step) => (
                <p key={step} className="text-muted-foreground">{step}</p>
              ))}
            </div>
            <Button
              onClick={() => handleClose(false)}
              variant="outline"
              className="w-full max-w-sm"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
