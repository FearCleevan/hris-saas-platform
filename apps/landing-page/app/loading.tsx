export default function RootLoading() {
  return (
    <div className="pt-16 min-h-screen animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center gap-6">
          <div className="h-6 w-32 bg-muted rounded-full" />
          <div className="h-12 w-2/3 bg-muted rounded-xl" />
          <div className="h-6 w-1/2 bg-muted rounded-lg" />
          <div className="flex gap-3">
            <div className="h-11 w-36 bg-muted rounded-lg" />
            <div className="h-11 w-36 bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <div className="h-5 w-3/4 bg-muted rounded-md" />
              <div className="h-4 w-full bg-muted rounded-md" />
              <div className="h-4 w-5/6 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
