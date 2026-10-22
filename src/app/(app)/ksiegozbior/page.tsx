import { BookWorkbench } from "@/components/BookWorkbench";
import { listBooks } from "@/lib/actions/books";
import { listLoans } from "@/lib/actions/loans";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  sygnatura?: string;
  author?: string;
  title?: string;
}>;

export default async function KsiegozbiorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [books, loans] = await Promise.all([
    listBooks({
      q: params.q,
      sygnatura: params.sygnatura,
      author: params.author,
      title: params.title,
    }),
    listLoans({ activeOnly: true }),
  ]);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <BookWorkbench
        books={books}
        activeLoans={loans.map((l) => ({
          bookId: l.bookId,
          loanId: l.id,
          dueAt: l.dueAt,
        }))}
        initialSygnatura={params.sygnatura ?? ""}
        initialKeyword={params.q ?? ""}
        initialAuthor={params.author ?? ""}
        initialTitle={params.title ?? ""}
        listPath="/ksiegozbior"
      />
    </div>
  );
}
