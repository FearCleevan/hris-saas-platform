export default function BlogLoading() {
  return (
    <div className="pt-16 animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-14 flex flex-col items-center gap-4">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-10 w-96 bg-muted rounded-xl" />
          <div className="h-5 w-72 bg-muted rounded-lg" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Featured skeleton */}
        <div className="mb-12">
          <div className="h-4 w-20 bg-muted rounded mb-4" />
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="h-3 w-full bg-muted" />
            <div className="p-8 flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-8 w-3/4 bg-muted rounded-lg" />
              <div className="h-5 w-full bg-muted rounded" />
              <div className="h-5 w-5/6 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="h-4 w-20 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="h-1.5 w-full bg-muted" />
              <div className="p-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-muted rounded-full" />
                  <div className="h-5 w-14 bg-muted rounded-full" />
                </div>
                <div className="h-5 w-full bg-muted rounded" />
                <div className="h-5 w-4/5 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
