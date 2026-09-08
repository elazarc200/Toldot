"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <main className="shell" role="alert">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        משהו השתבש
      </h1>
      <p className="lede">
        אירעה שגיאה בעת טעינת העמוד. הפרטים הטכניים אינם מוצגים מטעמי אבטחה.
      </p>
      {error.digest ? (
        <p className="muted">קוד ייחוס: {error.digest}</p>
      ) : null}
      <p>
        <button type="button" className="button" onClick={() => reset()}>
          נסו שוב
        </button>
      </p>
    </main>
  );
}
