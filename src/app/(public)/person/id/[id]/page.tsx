import { notFound, permanentRedirect } from "next/navigation";
import { getCanonicalSlug } from "@/application/public-loaders";

type Props = { params: Promise<{ id: string }> };

export default async function PersonIdRedirect({ params }: Props) {
  const { id } = await params;
  const slug = await getCanonicalSlug("person", id);
  if (!slug) notFound();
  permanentRedirect(`/person/${slug}`);
}
