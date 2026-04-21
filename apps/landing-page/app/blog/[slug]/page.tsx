import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import blogPosts from '@/data/blog-posts.json';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: 'Post Not Found' };
  return { title: post.title, description: post.excerpt };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 2);

  return (
    <div className="pt-16">
      <div className="border-b border-border" style={{ borderTopColor: post.color, borderTopWidth: 4 }}>
        <Container className="py-10 max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {post.readTime}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">{post.title}</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">{post.excerpt}</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0038a8]/10 flex items-center justify-center font-bold text-[#0038a8]">
              {post.author.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">{post.author.title}</p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-12 max-w-3xl">
        {/* Placeholder content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <div className="bg-muted/50 border border-border rounded-xl p-6 text-center text-muted-foreground">
            <p className="text-sm">Full article content coming soon.</p>
            <p className="text-xs mt-1">This article covers: {post.excerpt}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-border">
          {post.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              <Tag className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-foreground mb-4">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="group block">
                  <div className="bg-card border border-border rounded-xl p-4 hover:border-[#0038a8]/40 transition-colors">
                    <p className="text-xs text-muted-foreground mb-1">{r.category} · {r.readTime}</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-[#0038a8] transition-colors leading-snug">
                      {r.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
