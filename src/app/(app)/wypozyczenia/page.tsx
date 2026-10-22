import { LoanList } from "@/components/LoanList";
import { LoanWorkbench } from "@/components/LoanWorkbench";
import { listBooks } from "@/lib/actions/books";
import { listLoans } from "@/lib/actions/loans";
import { listPeople } from "@/lib/actions/people";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ bookId?: string }>;

export default async function WypozyczeniaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { bookId } = await searchParams;
  const selectedId = bookId ? Number(bookId) : NaN;

  const [books, people, loans, settings] = await Promise.all([
    listBooks(),
    listPeople(),
    listLoans({ activeOnly: true }),
    getSettings(),
  ]);

  const activeLoans = loans.map((l) => ({
    id: l.id,
    bookId: l.bookId,
    personId: l.personId,
    borrowedAt: l.borrowedAt,
    dueAt: l.dueAt,
    bookTitle: l.bookTitle,
    bookAuthors: l.bookAuthors,
    personFirstName: l.personFirstName,
    personLastName: l.personLastName,
  }));

  // Szczegóły 3-kolumnowe dopiero po wyborze pozycji
  if (Number.isFinite(selectedId) && selectedId > 0) {
    return (
      <div className="mx-auto h-full max-w-7xl">
        <LoanWorkbench
          books={books}
          people={people}
          activeLoans={activeLoans}
          defaultLoanDays={settings.defaultLoanDays}
          preselectedBookId={selectedId}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <LoanList loans={activeLoans} books={books} />
    </div>
  );
}
