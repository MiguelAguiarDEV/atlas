export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Atlas</h1>
        <p className="text-[var(--atlas-muted)] text-lg">
          Personal productivity system
        </p>
        <div className="flex gap-2 justify-center pt-4">
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--atlas-surface)] border border-[var(--atlas-border)]">
            Tasks
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--atlas-surface)] border border-[var(--atlas-border)]">
            Time
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--atlas-surface)] border border-[var(--atlas-border)]">
            Canvas
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--atlas-surface)] border border-[var(--atlas-border)]">
            Boards
          </span>
        </div>
      </div>
    </main>
  );
}
