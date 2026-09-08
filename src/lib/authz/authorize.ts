import type { Capability } from "@/lib/authz/capabilities";
import { isCapability } from "@/lib/authz/capabilities";
import { ForbiddenError, UnauthenticatedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/authz/session";

/**
 * Evaluates capability for the authenticated session identity only.
 * Does not accept a caller-selected user id — authority is DB `has_capability(auth.uid())`.
 */
export async function hasCapability(capability: Capability): Promise<boolean> {
  if (!isCapability(capability)) {
    throw new ValidationError("יכולת לא מוכרת");
  }

  const user = await getSessionUser();
  if (!user) {
    return false;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("has_capability", {
    capability,
  });

  if (error) {
    logger.error("has_capability rpc failed", {
      action: "has_capability",
      outcome: "failure",
      errorCode: error.code,
      userId: user.id,
      capability,
    });
    return false;
  }

  return data === true;
}

export async function requireCapability(capability: Capability): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    logger.info("capability check denied — unauthenticated", {
      action: "requireCapability",
      outcome: "denied",
      capability,
    });
    throw new UnauthenticatedError();
  }

  const allowed = await hasCapability(capability);
  if (!allowed) {
    logger.info("capability check denied", {
      action: "requireCapability",
      outcome: "denied",
      userId: user.id,
      capability,
    });
    throw new ForbiddenError();
  }

  logger.info("capability check allowed", {
    action: "requireCapability",
    outcome: "success",
    userId: user.id,
    capability,
  });
}

/** Editorial shell access — any active membership capability via `edit` baseline. */
export async function requireEditorialAccess(): Promise<void> {
  await requireCapability("edit");
}
