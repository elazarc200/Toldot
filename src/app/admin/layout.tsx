import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireEditorialAccess } from "@/lib/authz/authorize";
import { UnauthenticatedError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getToladotEnv, pilotBannerHe } from "@/lib/toladot-env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireEditorialAccess();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      logger.info("admin gate redirect — unauthenticated", {
        action: "admin_layout",
        outcome: "denied",
        route: "/admin",
      });
      redirect("/login?next=/admin");
    }
    if (error instanceof ForbiddenError) {
      logger.info("admin gate forbidden", {
        action: "admin_layout",
        outcome: "denied",
        route: "/admin",
      });
      redirect("/login?error=forbidden&next=/admin");
    }
    throw error;
  }

  const env = getToladotEnv();
  const banner = pilotBannerHe(env);

  return (
    <div>
      <header className="shell" style={{ paddingBlockEnd: 0 }}>
        {banner ? (
          <p
            data-toladot-env={env}
            style={{
              margin: "0 0 0.5rem",
              padding: "0.4rem 0.75rem",
              background: env === "pilot" ? "#fff3cd" : "#e8f0fe",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {env === "pilot" ? "PILOT · " : ""}
            {banner}
          </p>
        ) : null}
        <p className="muted" style={{ margin: 0 }}>
          אזור עריכה · תולדות
        </p>
      </header>
      {children}
    </div>
  );
}
