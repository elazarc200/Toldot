import { notFound, permanentRedirect } from "next/navigation";
import { getCanonicalSlug } from "@/application/public-loaders";

type Props = { params: Promise<{ id: string }> };

export default async function PeriodIdRedirect({ params }: Props) {
  const { id } = await params;
  const slug = await getCanonicalSlug("period", id);
  if (!slug) notFound();
  permanentRedirect(`/period/${slug}`);
}
