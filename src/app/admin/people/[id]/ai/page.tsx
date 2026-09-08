import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  acceptAiProposalFieldFormAction,
  cancelAiJobAction,
  enqueuePersonAiJobAction,
  ensurePersonAiConversationAction,
  markCitationEditorReviewedFormAction,
  rejectAiProposalFieldFormAction,
  resolveCitationToCanonicalFormAction,
} from "@/application/ai/actions";
import { ChronologyPreview } from "@/components/ai/ChronologyPreview";
import {
  acceptButtonLabelHe,
  applyModeLabelHe,
  getProposalApplyMode,
} from "@/domain/ai/proposal-apply-mode";

export const dynamic = "force-dynamic";

const TASKS = [
  { id: "coverage.gaps", label: "מה חסר?" },
  { id: "draft.person.biography", label: "טיוטת ביוגרפיה" },
  { id: "extract.relationships", label: "יחסים" },
  { id: "extract.teachings", label: "הוראות נבחרות" },
  { id: "extract.stories", label: "סיפורים" },
  { id: "chronology.propose", label: "כרונולוגיה" },
  { id: "identity.resolve", label: "זיהוי זהות" },
  { id: "duplicate.suggest", label: "כפילויות" },
  { id: "research.person.discovery", label: "מחקר גילוי" },
  { id: "claim.evaluate", label: "הערכת טענה" },
] as const;

export default async function PersonAiWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: personId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: person } = await supabase
    .from("people")
    .select("id, primary_display_name, lifecycle_status, updated_at")
    .eq("id", personId)
    .maybeSingle();

  if (!person) notFound();

  const conversationId = await ensurePersonAiConversationAction(personId);

  const [{ data: messages }, { data: jobs }, { data: proposals }, { data: findings }, { data: sourceWorks }, { data: usageToday }] =
    await Promise.all([
      supabase
        .from("ai_conversation_messages")
        .select("id, role, content, created_at, job_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(80),
      supabase
        .from("ai_jobs")
        .select(
          "id, task_type, status, cost_usd, tokens_in, tokens_out, error_message, error_code, queued_at, completed_at",
        )
        .eq("entity_id", personId)
        .eq("entity_type", "person")
        .order("queued_at", { ascending: false })
        .limit(30),
      supabase
        .from("ai_proposals")
        .select(
          "id, task_type, proposal_kind, status, structured_output, warnings, accepted_fields, rejected_fields, provider, model_id, model_version, created_at, dependency_fingerprint",
        )
        .eq("entity_id", personId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("ai_citation_findings")
        .select(
          "id, resolution_status, raw_citation_text, retrieval_adapter_code, provider_ref, provider_url, canonical_source_citation_id, warnings",
        )
        .eq("entity_id", personId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("source_works")
        .select("id, canonical_title")
        .order("canonical_title", { ascending: true })
        .limit(100),
      supabase
        .from("ai_usage_events")
        .select("estimated_cost_usd, created_at, task_type")
        .gte(
          "created_at",
          new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString(),
        )
        .limit(200),
    ]);

  const spentToday = (usageToday ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_cost_usd || 0),
    0,
  );

  async function enqueueAction(formData: FormData) {
    "use server";
    const taskType = String(formData.get("task_type"));
    const editorMessage = String(formData.get("editor_message") || "");
    const allowExternal = formData.get("allow_external") === "on";
    await enqueuePersonAiJobAction({
      personId,
      conversationId,
      taskType,
      ...(editorMessage ? { editorMessage } : {}),
      allowExternalResearch: allowExternal,
      confirmExpensive: true,
    });
  }

  async function cancelAction(formData: FormData) {
    "use server";
    await cancelAiJobAction(String(formData.get("job_id")));
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin/people">← אנשים</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.6rem" }}>
        סביבת AI — {person.primary_display_name}
      </h1>
      <p className="lede">
        הצעות בלבד. קבלה לעריכה אינה פרסום. מקורות חיצוניים אינם זהות ציטוט
        קנונית.
      </p>

      <section className="panel">
        <h2>הפעלת משימה</h2>
        <form className="form" action={enqueueAction}>
          <label>
            משימה
            <select name="task_type" required defaultValue="coverage.gaps">
              {TASKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            הודעת עורך / שאלת המשך
            <textarea name="editor_message" rows={3} />
          </label>
          <label>
            <input type="checkbox" name="allow_external" />
            אפשר מחקר רשת מבוקר (גילוי בלבד)
          </label>
          <button type="submit">הפעל מחקר</button>
        </form>
      </section>

      <section className="panel">
        <h2>שיחה</h2>
        <ul>
          {(messages ?? []).map((m) => (
            <li key={m.id}>
              <strong>{m.role}</strong>: {m.content}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>משימות (Jobs)</h2>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          עלות משוערת היום (שימוש AI): ~${spentToday.toFixed(4)}
        </p>
        <ul>
          {(jobs ?? []).map((j) => (
            <li key={j.id}>
              <code>{j.task_type}</code> — {j.status}
              {j.cost_usd != null ? ` · ~$${j.cost_usd}` : ""}
              {j.error_code ? ` · ${j.error_code}` : ""}
              {j.error_message ? ` · ${j.error_message}` : ""}
              {j.status === "queued" || j.status === "running" ? (
                <form action={cancelAction} style={{ display: "inline" }}>
                  <input type="hidden" name="job_id" value={j.id} />
                  <button type="submit">בטל</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>ממצאי ציטוט</h2>
        <p>
          discovered ≠ evidence. קישורי ספאריה הם מטא־נתוני רזולוציה בלבד.
          open-web discovery אינו הופך לראיה אוטומטית.
        </p>
        <ul>
          {(findings ?? []).map((f) => (
            <li key={f.id} style={{ marginBottom: "1rem" }}>
              <strong>{f.resolution_status}</strong>: {f.raw_citation_text}
              {f.retrieval_adapter_code
                ? ` · adapter=${f.retrieval_adapter_code}`
                : ""}
              {f.provider_ref ? ` · provider_ref=${f.provider_ref}` : ""}
              {f.canonical_source_citation_id
                ? ` · canonical=${f.canonical_source_citation_id}`
                : ""}
              {f.resolution_status === "discovered" ||
              f.resolution_status === "unresolved" ? (
                <form
                  action={resolveCitationToCanonicalFormAction}
                  className="form"
                  style={{ marginTop: 8 }}
                >
                  <input type="hidden" name="finding_id" value={f.id} />
                  <input
                    type="hidden"
                    name="provider_code"
                    value={f.retrieval_adapter_code || ""}
                  />
                  <input
                    type="hidden"
                    name="provider_ref"
                    value={f.provider_ref || ""}
                  />
                  <input
                    type="hidden"
                    name="provider_url"
                    value={f.provider_url || ""}
                  />
                  <label>
                    חיבור ל-source_work
                    <select name="source_work_id" required>
                      <option value="">— בחרו —</option>
                      {(sourceWorks ?? []).map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.canonical_title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    תצוגת ציטוט בעברית
                    <input
                      name="citation_display_he"
                      required
                      defaultValue={f.raw_citation_text}
                    />
                  </label>
                  <button type="submit">פתור לציטוט קנוני</button>
                </form>
              ) : null}
              {f.resolution_status === "resolved" ? (
                <form
                  action={markCitationEditorReviewedFormAction}
                  style={{ marginTop: 8 }}
                >
                  <input type="hidden" name="finding_id" value={f.id} />
                  <button type="submit">סמן כנסקר (editor_reviewed)</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>הצעות לסקירה</h2>
        {(proposals ?? []).map((p) => {
          const output = p.structured_output as Record<string, unknown>;
          const kind = String(output.proposal_kind || p.proposal_kind);
          const applyMode = getProposalApplyMode(kind);
          const canAutoApply = applyMode === "automatic_draft_apply";
          return (
            <article key={p.id} style={{ marginBottom: "1.5rem" }}>
              <h3>
                {kind} · {p.status} · {p.provider}/{p.model_id}
              </h3>
              <p
                className="muted"
                data-apply-mode={applyMode}
                style={{ fontSize: "0.9rem" }}
              >
                {applyModeLabelHe(applyMode)}
              </p>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "0.85rem",
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(output, null, 2)}
              </pre>
              {kind === "chronology" ? (
                <ChronologyPreview
                  plainLanguageHe={String(output.plain_language_he || "")}
                  band={String(output.relative_band || "")}
                  continues={Boolean(output.continues_into_next)}
                  conflicts={
                    (output.conflicts as Array<{ description: string }>) || []
                  }
                />
              ) : null}
              <div className="form" style={{ flexDirection: "row", gap: 8 }}>
                <form action={acceptAiProposalFieldFormAction}>
                  <input type="hidden" name="proposal_id" value={p.id} />
                  <input
                    type="hidden"
                    name="field_path"
                    value={defaultFieldPath(kind)}
                  />
                  <button type="submit">{acceptButtonLabelHe(applyMode)}</button>
                </form>
                <form action={rejectAiProposalFieldFormAction}>
                  <input type="hidden" name="proposal_id" value={p.id} />
                  <input
                    type="hidden"
                    name="field_path"
                    value={defaultFieldPath(kind)}
                  />
                  <input type="hidden" name="reason" value="נדחה ע״י עורך" />
                  <button type="submit">דחה</button>
                </form>
              </div>
              {!canAutoApply ? (
                <p style={{ fontSize: "0.85rem" }}>
                  לחיצה זו רושמת החלטת סקירה ושומרת provenance. היא{" "}
                  <strong>אינה</strong> כותבת אוטומטית לטבלאות הקנוניות — השלימו
                  ידנית במסכי העריכה הרגילים אם רלוונטי.
                </p>
              ) : (
                <p style={{ fontSize: "0.85rem" }}>
                  החלה לטיוטה בלבד. פרסום ציבורי דורש פעולת פרסום מפורשת נפרדת.
                </p>
              )}
              <p style={{ fontSize: "0.8rem" }}>
                fingerprint: {p.dependency_fingerprint}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function defaultFieldPath(kind: string): string {
  switch (kind) {
    case "biography":
      return "substantive_biography_md";
    case "relationship":
      return "relationship";
    case "claim":
      return "statement_text";
    case "chronology":
      return "chronology_editorial";
    default:
      return "primary";
  }
}
