/**
 * Seder HaDorot relationship visual tokens.
 * Three lab variants — production default is variant 1 until editorial lock.
 * Color is reinforcement only; dash pattern + markers carry meaning.
 */

import type { RelationshipFamily } from "@/domain/knowledge";

export type SederVisualVariant = 1 | 2 | 3;

export type EdgeMarkerKind = "arrow" | "circle" | "diamond" | "bar" | "none";

export type FamilyEdgeTokens = {
  /** Line dash pattern in CSS/canvas units; empty = solid. */
  dash: number[];
  lineWidth: number;
  /** Optional color reinforcement — never sole carrier of meaning. */
  color: string;
  marker: EdgeMarkerKind;
  opacity: number;
};

export type SederVisualTokenSet = {
  variant: SederVisualVariant;
  label_he: string;
  description_he: string;
  families: Record<RelationshipFamily, FamilyEdgeTokens>;
  disputed: {
    dash: number[];
    opacity: number;
    lineWidthBoost: number;
  };
  uncertain: {
    dash: number[];
    opacity: number;
  };
  personBlock: {
    fill: string;
    fillSelected: string;
    fillDimmed: string;
    stroke: string;
    strokeSelected: string;
    labelColor: string;
    labelDimmed: string;
  };
  band: {
    fillOdd: string;
    fillEven: string;
    labelColor: string;
  };
  hopEmphasis: {
    neighborOpacity: number;
    otherOpacity: number;
  };
};

const VARIANT_1: SederVisualTokenSet = {
  variant: 1,
  label_he: "וריאנט 1 — ברירת מחדל",
  description_he:
    "קווים מלאים לרב–תלמיד, מקפים למשפחה, נקודות לבר פלוגתא. צבע משני בלבד.",
  families: {
    teacher_student: {
      dash: [],
      lineWidth: 2.25,
      color: "#2f4a3a",
      marker: "arrow",
      opacity: 0.9,
    },
    parent_child: {
      dash: [8, 4],
      lineWidth: 2,
      color: "#5c5348",
      marker: "circle",
      opacity: 0.85,
    },
    spouse: {
      dash: [4, 4],
      lineWidth: 1.75,
      color: "#6b5a3e",
      marker: "diamond",
      opacity: 0.8,
    },
    sibling: {
      dash: [2, 4],
      lineWidth: 1.5,
      color: "#7a6e5c",
      marker: "bar",
      opacity: 0.75,
    },
    bar_plugta: {
      dash: [1, 3],
      lineWidth: 2,
      color: "#8a4b3a",
      marker: "diamond",
      opacity: 0.85,
    },
  },
  disputed: { dash: [3, 2, 1, 2], opacity: 0.7, lineWidthBoost: 0.5 },
  uncertain: { dash: [2, 5], opacity: 0.55 },
  personBlock: {
    fill: "#f4efe4",
    fillSelected: "#3f6350",
    fillDimmed: "#e8e0d2",
    stroke: "#2f4a3a",
    strokeSelected: "#1c2420",
    labelColor: "#1f1a14",
    labelDimmed: "#9a9080",
  },
  band: {
    fillOdd: "rgba(47, 74, 58, 0.06)",
    fillEven: "rgba(196, 163, 90, 0.07)",
    labelColor: "#5c5348",
  },
  hopEmphasis: { neighborOpacity: 1, otherOpacity: 0.22 },
};

const VARIANT_2: SederVisualTokenSet = {
  variant: 2,
  label_he: "וריאנט 2 — משקל עבה",
  description_he:
    "עובי קו מודגש לפי משפחה; חצים/עיגולים/מקפים. צבע משני בלבד.",
  families: {
    teacher_student: {
      dash: [],
      lineWidth: 3.25,
      color: "#1c2420",
      marker: "arrow",
      opacity: 0.95,
    },
    parent_child: {
      dash: [10, 3],
      lineWidth: 2.75,
      color: "#3f6350",
      marker: "arrow",
      opacity: 0.9,
    },
    spouse: {
      dash: [6, 3, 2, 3],
      lineWidth: 2.5,
      color: "#6b5a3e",
      marker: "circle",
      opacity: 0.85,
    },
    sibling: {
      dash: [3, 3],
      lineWidth: 2,
      color: "#7a6e5c",
      marker: "bar",
      opacity: 0.8,
    },
    bar_plugta: {
      dash: [2, 2],
      lineWidth: 2.75,
      color: "#a05540",
      marker: "bar",
      opacity: 0.9,
    },
  },
  disputed: { dash: [4, 2, 1, 2, 1, 2], opacity: 0.75, lineWidthBoost: 0.75 },
  uncertain: { dash: [1, 6], opacity: 0.5 },
  personBlock: {
    fill: "#fffaf0",
    fillSelected: "#2f4a3a",
    fillDimmed: "#ebe3d4",
    stroke: "#3f6350",
    strokeSelected: "#1c2420",
    labelColor: "#1f1a14",
    labelDimmed: "#a39888",
  },
  band: {
    fillOdd: "rgba(31, 26, 20, 0.05)",
    fillEven: "rgba(63, 99, 80, 0.08)",
    labelColor: "#5c5348",
  },
  hopEmphasis: { neighborOpacity: 1, otherOpacity: 0.18 },
};

const VARIANT_3: SederVisualTokenSet = {
  variant: 3,
  label_he: "וריאנט 3 — סימנים בולטים",
  description_he:
    "דגש על סמני קצה (חץ/יהלום/עיגול) ומקפים קצרים. צבע משני בלבד.",
  families: {
    teacher_student: {
      dash: [12, 2],
      lineWidth: 2,
      color: "#2f4a3a",
      marker: "arrow",
      opacity: 0.92,
    },
    parent_child: {
      dash: [],
      lineWidth: 1.75,
      color: "#4a5c4e",
      marker: "circle",
      opacity: 0.88,
    },
    spouse: {
      dash: [5, 5],
      lineWidth: 1.75,
      color: "#8a7048",
      marker: "diamond",
      opacity: 0.85,
    },
    sibling: {
      dash: [1, 5],
      lineWidth: 1.5,
      color: "#6e6658",
      marker: "none",
      opacity: 0.7,
    },
    bar_plugta: {
      dash: [4, 2, 1, 2],
      lineWidth: 2.25,
      color: "#9a4030",
      marker: "diamond",
      opacity: 0.9,
    },
  },
  disputed: { dash: [2, 2, 6, 2], opacity: 0.72, lineWidthBoost: 0.6 },
  uncertain: { dash: [1, 4, 1, 8], opacity: 0.48 },
  personBlock: {
    fill: "#f7f3eb",
    fillSelected: "#c4a35a",
    fillDimmed: "#e5ddd0",
    stroke: "#2f4a3a",
    strokeSelected: "#1f1a14",
    labelColor: "#1f1a14",
    labelDimmed: "#9a9080",
  },
  band: {
    fillOdd: "rgba(196, 163, 90, 0.08)",
    fillEven: "rgba(47, 74, 58, 0.05)",
    labelColor: "#5c5348",
  },
  hopEmphasis: { neighborOpacity: 1, otherOpacity: 0.2 },
};

const TOKEN_SETS: Record<SederVisualVariant, SederVisualTokenSet> = {
  1: VARIANT_1,
  2: VARIANT_2,
  3: VARIANT_3,
};

/** Production default until editorial locks tokens via lab. */
export const DEFAULT_SEDER_VISUAL_VARIANT: SederVisualVariant = 1;

export function getSederVisualTokens(
  variant: SederVisualVariant = DEFAULT_SEDER_VISUAL_VARIANT,
): SederVisualTokenSet {
  return TOKEN_SETS[variant];
}

export const SEDER_VISUAL_VARIANTS: SederVisualVariant[] = [1, 2, 3];

export const FAMILY_LABELS_HE: Record<RelationshipFamily, string> = {
  teacher_student: "רב–תלמיד",
  parent_child: "הורה–ילד",
  spouse: "בן/בת זוג",
  sibling: "אחים",
  bar_plugta: "בר פלוגתא",
};
