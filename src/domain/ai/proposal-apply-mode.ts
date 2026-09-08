/** Classification of how Accept interacts with canonical draft data. */
export type ProposalApplyMode =
  | "automatic_draft_apply"
  | "manual_reconstruction"
  | "review_only";

export function getProposalApplyMode(kind: string): ProposalApplyMode {
  switch (kind) {
    case "biography":
    case "claim":
    case "relationship":
    case "chronology":
      return "automatic_draft_apply";
    case "story":
    case "teaching":
    case "identity":
    case "duplicate":
    case "place_identify":
      return "manual_reconstruction";
    case "coverage":
    default:
      return "review_only";
  }
}

export function applyModeLabelHe(mode: ProposalApplyMode): string {
  switch (mode) {
    case "automatic_draft_apply":
      return "החלה אוטומטית לטיוטה קנונית (לא פרסום)";
    case "manual_reconstruction":
      return "סקירה בלבד — נדרשת השלמה ידנית בטפסי העריכה";
    case "review_only":
      return "ייעוץ/סקירה בלבד — אין כתיבה קנונית בלחיצה";
  }
}

export function acceptButtonLabelHe(mode: ProposalApplyMode): string {
  switch (mode) {
    case "automatic_draft_apply":
      return "החל לטיוטה קנונית";
    case "manual_reconstruction":
      return "סמן כנסקר (ללא כתיבה אוטומטית)";
    case "review_only":
      return "סמן כנסקר / ייעוץ";
  }
}
