import { AppShell, PageHeader } from "./ui";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <AppShell nav={false}>
      <PageHeader title={title} back="/profile" />
      <p className="text-xs text-muted-foreground">Last updated October 2026</p>
      <div className="mt-4 space-y-5">
        {sections.map(([h, b]) => (
          <section key={h}>
            <h2 className="font-extrabold">{h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b}</p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
