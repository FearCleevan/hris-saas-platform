import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';
import blogPosts from '@/data/blog-posts.json';
import { NewsletterForm } from './NewsletterForm';

export const metadata: Metadata = {
  title: 'Blog — PH HR & Payroll Compliance Guides',
  description: 'Expert guides on BIR TRAIN Law, SSS, PhilHealth, Pag-IBIG, Labor Code, and Philippine HR compliance — written by practitioners.',
};

const featured = blogPosts.filter((p) => p.featured);
const all = blogPosts;

const CATEGORY_COLORS: Record<string, string> = {
  'BIR Compliance': 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
  'SSS': 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800',
  'PhilHealth': 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800',
  'Labor Code': 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800',
  'Payroll': 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-800',
  'Data Privacy': 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800',
};

function categoryClass(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'text-muted-foreground bg-muted border-border';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  const [featuredPost, ...rest] = featured;
  const remaining = all.filter((p) => p.id !== featuredPost?.id);

  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            HRISPH Blog
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Philippine HR & Payroll{' '}
            <span className="text-[#0038a8]">Compliance Guides</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Written by CPAs, BIR examiners, and HR practitioners. Always updated to the latest circulars.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        {/* Featured post */}
        {featuredPost && (
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-4">Featured</p>
            <Link href={`/blog/${featuredPost.slug}`} className="group block">
              <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-[#0038a8]/40 transition-colors">
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: featuredPost.color }}
                />
                <div className="p-8 sm:p-10">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${categoryClass(featuredPost.category)}`}>
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {featuredPost.readTime}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(featuredPost.publishedAt)}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3 group-hover:text-[#0038a8] transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4 max-w-2xl">{featuredPost.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0038a8]/10 flex items-center justify-center text-xs font-bold text-[#0038a8]">
                        {featuredPost.author.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{featuredPost.author.name}</p>
                        <p className="text-xs text-muted-foreground">{featuredPost.author.title}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#0038a8] flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* All posts grid */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-4">All Articles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {remaining.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <div className="bg-card border border-border rounded-2xl overflow-hidden h-full hover:border-[#0038a8]/40 transition-colors flex flex-col">
                  <div className="h-1.5 w-full" style={{ backgroundColor: post.color }} />
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${categoryClass(post.category)}`}>
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {post.readTime}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground leading-snug group-hover:text-[#0038a8] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                          <Tag className="h-2.5 w-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0038a8]/10 flex items-center justify-center text-[10px] font-bold text-[#0038a8]">
                          {post.author.initials}
                        </div>
                        <span className="text-xs text-muted-foreground">{post.author.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl font-extrabold text-foreground mb-2">
            Stay updated on PH HR compliance
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
            Get notified when new SSS, PhilHealth, Pag-IBIG, or BIR circulars are released — and what they mean for your payroll.
          </p>
          <NewsletterForm />
          <p className="text-xs text-muted-foreground mt-3">No spam. Unsubscribe anytime.</p>
        </div>
      </Container>
    </div>
  );
}
