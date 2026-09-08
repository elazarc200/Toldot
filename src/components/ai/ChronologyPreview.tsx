/** Client-free chronology proposal preview — does not mutate public Seder. */
export function ChronologyPreview(props: {
  plainLanguageHe: string;
  band: string;
  continues: boolean;
  conflicts: Array<{ description: string }>;
}) {
  return (
    <div
      className="panel"
      style={{
        background: "linear-gradient(180deg, #f7f3ea, #efe6d6)",
        border: "1px solid #cbb894",
      }}
    >
      <h4>תצוגת מיקום מוצעת (טיוטה בלבד)</h4>
      <p>{props.plainLanguageHe}</p>
      <p>
        רצועה: <strong>{props.band}</strong>
        {props.continues ? " · ממשיך לדור הבא" : ""}
      </p>
      {props.conflicts.length > 0 ? (
        <ul>
          {props.conflicts.map((c, i) => (
            <li key={i}>{c.description}</li>
          ))}
        </ul>
      ) : (
        <p>אין התנגשויות מדווחות.</p>
      )}
      <p style={{ fontSize: "0.85rem" }}>
        תצוגה זו אינה משנה את סדר הדורות הציבורי. רק אחרי אישור ופרסום.
      </p>
    </div>
  );
}
