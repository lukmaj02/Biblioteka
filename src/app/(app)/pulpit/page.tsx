import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | undefined>>;

/** Stary adres pulpitu → lista książek */
export default async function PulpitRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  redirect(query ? `/ksiegozbior?${query}` : "/ksiegozbior");
}
