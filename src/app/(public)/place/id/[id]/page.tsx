import { notFound, permanentRedirect } from "next/navigation";
import { getCanonicalSlug } from "@/application/public-loaders";

type Props = { params: Promise<{ id: string }> };

export default async function PlaceIdRedirect({ params }: Props) {
  const { id } = await params;
  const slug = await getCanonicalSlug("place", id);
  if (!slug) notFound();
  permanentRedirect(`/place/${slug}`);
}
