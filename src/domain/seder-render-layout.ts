/**
 * Discardable Seder render layout helpers.
 *
 * Hard boundary: these functions assign visual lanes / packing only.
 * They must never modify, overwrite, or reinterpret historical Y placement
 * (`y_start_norm` / `y_end_norm` / `block_length_norm`).
 */

export type RenderLaneNode = {
  person_id: string;
  y_start_norm: number;
  y_end_norm: number;
};

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Greedy lane packing by overlapping Y intervals.
 * Returns person_id → x_lane (0-based). Does not touch historical Y.
 */
export function assignRenderLanes(
  nodes: RenderLaneNode[],
): Map<string, number> {
  const sorted = [...nodes].sort((a, b) => {
    if (a.y_start_norm !== b.y_start_norm) {
      return a.y_start_norm - b.y_start_norm;
    }
    if (a.y_end_norm !== b.y_end_norm) {
      return a.y_end_norm - b.y_end_norm;
    }
    return a.person_id.localeCompare(b.person_id);
  });

  /** Per lane: list of occupied [y_start, y_end) intervals. */
  const laneEnds: { y_start: number; y_end: number }[][] = [];
  const result = new Map<string, number>();

  for (const node of sorted) {
    let assigned = -1;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      const occupied = laneEnds[lane]!;
      const conflict = occupied.some((iv) =>
        intervalsOverlap(
          node.y_start_norm,
          node.y_end_norm,
          iv.y_start,
          iv.y_end,
        ),
      );
      if (!conflict) {
        assigned = lane;
        break;
      }
    }
    if (assigned < 0) {
      assigned = laneEnds.length;
      laneEnds.push([]);
    }
    laneEnds[assigned]!.push({
      y_start: node.y_start_norm,
      y_end: node.y_end_norm,
    });
    result.set(node.person_id, assigned);
  }

  return result;
}
