"use client"; // Error boundaries must be Client Components

// Last-resort page when even the root layout fails. It replaces the root
// layout, so it brings its own <html>/<body> and simple inline styles (the
// app's stylesheet and fonts aren't loaded here). No error details are shown.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#0f172a", background: "#fff" }}>
        <title>Something went wrong</title>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.875rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#475569", maxWidth: "28rem" }}>The site couldn&apos;t be loaded. Please try again in a moment.</p>
          {error.digest && <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: "1.5rem", padding: "10px 16px", border: 0, borderRadius: 8, background: "#0f766e", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
