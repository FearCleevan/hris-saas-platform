'use client';

import { motion } from 'framer-motion';

export function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0038a8]/20 to-[#ce1126]/20 blur-3xl rounded-3xl scale-95" />

      {/* Browser chrome */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ce1126]/60" />
            <div className="w-3 h-3 rounded-full bg-[#fcd116]/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground w-48 text-center">
              app.hrisph.com
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="flex h-72 sm:h-80">
          {/* Sidebar */}
          <div className="w-14 sm:w-44 bg-[#0038a8] dark:bg-[#002580] flex flex-col p-2 sm:p-3 gap-1 shrink-0">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-white/20 shrink-0" />
              <span className="hidden sm:block text-white text-xs font-bold truncate">HRISPH</span>
            </div>
            {['Dashboard', 'Employees', 'Payroll', 'Attendance', 'Leave', 'Reports'].map(
              (item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    i === 2
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <div className="w-3 h-3 rounded-sm bg-current opacity-70 shrink-0" />
                  <span className="hidden sm:block text-xs truncate">{item}</span>
                </div>
              ),
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col gap-3 overflow-hidden bg-background">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <div className="h-3.5 w-24 bg-foreground/80 rounded-md" />
                <div className="h-2.5 w-36 bg-muted-foreground/40 rounded-md mt-1" />
              </div>
              <div className="h-7 w-20 rounded-md bg-[#0038a8] flex items-center justify-center">
                <div className="h-2 w-12 bg-white/80 rounded-full" />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Employees', val: '1,248', color: 'bg-[#0038a8]/10' },
                { label: 'On Leave', val: '32', color: 'bg-[#fcd116]/10' },
                { label: 'Net Payroll', val: '₱4.2M', color: 'bg-green-500/10' },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.color} rounded-lg p-2`}>
                  <div className="h-2 w-14 bg-muted-foreground/30 rounded mb-1" />
                  <div className="h-4 w-10 bg-foreground/70 rounded-md" />
                </div>
              ))}
            </div>

            {/* Payroll table */}
            <div className="flex-1 border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
                {['Employee', 'Basic Pay', 'Deductions', 'Net Pay'].map((h) => (
                  <div key={h} className="h-2 bg-muted-foreground/40 rounded-full" />
                ))}
              </div>
              {[
                ['#ce1126', '#0038a8', '#fcd116'],
                ['#0038a8', '#ce1126', '#fcd116'],
                ['#fcd116', '#0038a8', '#ce1126'],
                ['#0038a8', '#fcd116', '#ce1126'],
              ].map((colors, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-2 px-3 py-1.5 border-b border-border/50 items-center"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: colors[0] + '40' }}
                    />
                    <div className="h-2 flex-1 bg-muted-foreground/30 rounded-full" />
                  </div>
                  <div className="h-2 bg-muted-foreground/25 rounded-full" />
                  <div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: colors[1] + '40' }}
                  />
                  <div
                    className="h-2.5 rounded-full"
                    style={{ backgroundColor: '#16a34a40' }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom badges */}
            <div className="flex gap-2">
              <div className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs font-medium">SSS ✓</span>
              </div>
              <div className="flex items-center gap-1 bg-[#0038a8]/10 text-[#0038a8] dark:text-blue-400 rounded-full px-2 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0038a8]" />
                <span className="text-xs font-medium">BIR ✓</span>
              </div>
              <div className="flex items-center gap-1 bg-[#ce1126]/10 text-[#ce1126] dark:text-red-400 rounded-full px-2 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ce1126]" />
                <span className="text-xs font-medium">PhilHealth ✓</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating stat cards */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute -left-4 sm:-left-8 top-16 bg-card border border-border rounded-xl shadow-lg px-3 py-2 hidden sm:block"
      >
        <p className="text-xs text-muted-foreground">Payroll Processed</p>
        <p className="text-lg font-bold text-foreground">₱12.4M</p>
        <p className="text-xs text-green-600">↑ 8.2% this month</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.1 }}
        className="absolute -right-4 sm:-right-8 bottom-16 bg-card border border-border rounded-xl shadow-lg px-3 py-2 hidden sm:block"
      >
        <p className="text-xs text-muted-foreground">Compliance Rate</p>
        <p className="text-lg font-bold text-green-600">100%</p>
        <p className="text-xs text-muted-foreground">SSS · BIR · Pag-IBIG</p>
      </motion.div>
    </div>
  );
}
