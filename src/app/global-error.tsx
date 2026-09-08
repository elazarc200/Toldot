"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: '"Segoe UI", "Arial Hebrew", "David", "Tahoma", sans-serif',
          color: "#1f1a14",
          background: "linear-gradient(160deg, #f7f3eb 0%, #ebe3d4 100%)",
          lineHeight: 1.6,
        }}
      >
        <main
          role="alert"
          style={{
            maxInlineSize: "52rem",
            marginInline: "auto",
            paddingBlock: "2.5rem",
            paddingInline: "1.5rem",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>תולדות — שגיאה</h1>
          <p>
            אירעה שגיאה כללית במערכת. אין כאן מידע רגיש; נסו לרענן או לחזור מאוחר
            יותר.
          </p>
          {error.digest ? (
            <p style={{ color: "#5c5348" }}>קוד ייחוס: {error.digest}</p>
          ) : null}
          <p>
            <button type="button" onClick={() => reset()}>
              נסו שוב
            </button>
          </p>
        </main>
      </body>
    </html>
  );
}
