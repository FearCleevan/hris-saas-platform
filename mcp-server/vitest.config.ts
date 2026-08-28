import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // No live DB/Supabase calls in unit tests — every module that talks to
    // pg/supabase-js is mocked. If a test ever needs the real project, it
    // belongs in a separate integration suite (not written yet), not here.
    testTimeout: 5000,
  },
})
