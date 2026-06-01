import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { LEGAL_DOCS, getLegalDoc, AGREEMENTS_VERSION } from "@/lib/legal";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/legal")({
  component: LegalIndex,
});

function LegalIndex() {
  // Read optional ?doc=slug from the URL hash-friendly way via window
  const slug =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("doc") ?? undefined
      : undefined;
  const active = slug ? getLegalDoc(slug) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="hi-vis-stripe h-2" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>

        {active ? (
          <article className="prose prose-sm sm:prose max-w-none">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Version {AGREEMENTS_VERSION}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{active.title}</h1>
            <p className="text-muted-foreground">{active.short}</p>
            <div className="mt-6 space-y-5">
              {active.sections.map((s) => (
                <section key={s.heading}>
                  <h2 className="text-lg font-semibold">{s.heading}</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {s.body}
                  </p>
                </section>
              ))}
            </div>
            <p className="mt-8">
              <Link to="/legal" className="text-primary underline">
                ← All legal documents
              </Link>
            </p>
          </article>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold">Legal & Policies</h1>
            <p className="text-muted-foreground mt-2">
              The documents below form the agreement between self-employed
              operatives and Light Work Live Ltd. You will be asked to accept
              them when you sign up. Current version:{" "}
              <span className="font-mono">{AGREEMENTS_VERSION}</span>.
            </p>
            <div className="mt-6 grid gap-3">
              {LEGAL_DOCS.map((d) => (
                <a
                  key={d.slug}
                  href={`/legal?doc=${d.slug}`}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:border-primary transition"
                >
                  <FileText className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.short}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
      <div className="hi-vis-stripe h-2" />
    </div>
  );
}
