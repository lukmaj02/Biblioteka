import { CatalogSearch } from "@/components/CatalogSearch";
import { listBooks } from "@/lib/actions/books";
import { getDashboardStats } from "@/lib/actions/loans";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; available?: string }>;

export default async function WyszukiwarkaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const availableOnly = params.available === "1";

  const [books, stats] = await Promise.all([
    listBooks({
      q: params.q,
      status: availableOnly ? "dostepna" : "",
    }),
    getDashboardStats(),
  ]);

  return (
    <CatalogSearch
      books={books}
      initialQ={params.q ?? ""}
      initialAvailableOnly={availableOnly}
      overdueCount={stats.overdueCount}
      bookCount={stats.bookCount}
      activeLoans={stats.activeLoans}
    />
  );
}
