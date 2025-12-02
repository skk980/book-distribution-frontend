import { useEffect, useMemo, useState, ReactNode, Fragment } from "react";
import {
  getSummaryReport,
  getTrips,
  getBooks,
  Trip,
  SummaryReport,
  Book,
} from "../apis/client";

type DailyBookDetail = {
  bookName: string;
  sold: number;
  expectedAmount: number;
  amountCollected: number;
};

type DailyAgg = {
  date: string;
  booksSold: number;
  expectedAmount: number;
  amountCollected: number;
  details: DailyBookDetail[];
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const [overallSummary, setOverallSummary] = useState<SummaryReport | null>(
    null
  );
  const [todaySummary, setTodaySummary] = useState<SummaryReport | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load data once
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [overall, today, tripsData, books] = await Promise.all([
          getSummaryReport(), // overall
          getSummaryReport(TODAY), // today
          getTrips(), // all trips
          getBooks(), // stock
        ]);

        setOverallSummary(overall);
        setTodaySummary(today);
        setTrips(tripsData);

        const stockTotal = (books as Book[]).reduce(
          (sum, b) => sum + (b.currentStock ?? 0),
          0
        );
        setTotalStock(stockTotal);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // derive today stats (trips count from trips, amounts from todaySummary)
  const todayStats = useMemo(() => {
    const tripsToday = trips.filter((t) => t.date === TODAY).length;
    const summary = todaySummary;
    return {
      trips: tripsToday,
      totalBooksSold: summary?.totalBooksSold ?? 0,
      totalExpected: summary?.expectedAmount ?? 0,
      totalAmountCollected: summary?.amountCollected ?? 0,
      difference: summary?.difference ?? 0,
    };
  }, [trips, todaySummary]);

  const todayDifference = todayStats.difference;

  // overall cards
  const overallBooksSold = overallSummary?.totalBooksSold ?? 0;
  const overallAmountCollected = overallSummary?.amountCollected ?? 0;

  // build day-wise aggregates from all trips
  const dailyAggs: DailyAgg[] = useMemo(() => {
    const byDate: Record<string, DailyAgg> = {};

    for (const trip of trips) {
      const date = trip.date;
      if (!byDate[date]) {
        byDate[date] = {
          date,
          booksSold: 0,
          expectedAmount: 0,
          amountCollected: 0,
          details: [],
        };
      }
      const agg = byDate[date];

      for (const item of trip.items) {
        const sold = Math.max(item.quantityOut - (item.quantityReturn || 0), 0);
        const price =
          typeof item.book === "object" && item.book
            ? (item.book as any).salePrice || 0
            : 0;
        const expected = sold * price;
        const collected = item.amountReturned || 0;

        agg.booksSold += sold;
        agg.expectedAmount += expected;
        agg.amountCollected += collected;

        const bookName =
          typeof item.book === "object" && item.book
            ? (item.book as any).productName
            : "Unknown";

        const existing = agg.details.find((d) => d.bookName === bookName);
        if (existing) {
          existing.sold += sold;
          existing.expectedAmount += expected;
          existing.amountCollected += collected;
        } else {
          agg.details.push({
            bookName,
            sold,
            expectedAmount: expected,
            amountCollected: collected,
          });
        }
      }
    }

    // sort by date desc, keep last few days (e.g. 7)
    return Object.values(byDate)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 7);
  }, [trips]);

  // Top distributed books overall
  const topBooks = useMemo(() => {
    const map = new Map<string, number>();

    for (const trip of trips) {
      for (const item of trip.items) {
        const sold = Math.max(item.quantityOut - (item.quantityReturn || 0), 0);
        const bookName =
          typeof item.book === "object" && item.book
            ? (item.book as any).productName
            : "Unknown";

        map.set(bookName, (map.get(bookName) || 0) + sold);
      }
    }

    const arr = Array.from(map.entries()).map(([name, sold]) => ({
      name,
      sold,
    }));
    arr.sort((a, b) => b.sold - a.sold);
    return arr.slice(0, 5);
  }, [trips]);

  const handleToggleExpand = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
        Dashboard
      </h1>

      {loading && (
        <p className="text-xs text-slate-500">Loading dashboard data...</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {/* Overall + Today stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Books in Stock" value={totalStock} />
        <StatCard
          label="Overall Books Sold (Till Today)"
          value={overallBooksSold}
        />
        <StatCard
          label="Overall Amount Collected"
          value={`₹${overallAmountCollected.toLocaleString()}`}
        />
        <StatCard
          label="Today's Collections"
          value={
            todayStats.trips === 0
              ? "No trips"
              : `₹${todayStats.totalAmountCollected.toLocaleString()}`
          }
        />
      </div>

      {/* Today focus + Top books + Recent days */}
      <div className="md:grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Today's Trips Summary">
            <p className="text-sm text-slate-500 mb-3">
              Quick view of distribution activity for today ({TODAY}).
            </p>
            {/* Changed grid for mobile friendliness */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
              <SummaryPill label="Trips Today" value={todayStats.trips} />
              <SummaryPill
                label="Books Sold Today"
                value={todayStats.totalBooksSold}
              />
              <SummaryPill
                label="Expected Amount Today"
                value={`₹${todayStats.totalExpected.toLocaleString()}`}
              />
              <SummaryPill
                label="Amount Difference Today"
                value={
                  todayStats.trips === 0
                    ? "—"
                    : `₹${todayDifference.toLocaleString()}`
                }
                valueClass={
                  todayDifference === 0
                    ? "text-slate-900"
                    : todayDifference > 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                }
              />
            </div>
          </SectionCard>

          {/* Recent days with book-wise details + difference */}
          <SectionCard title="Recent Days Overview">
            <p className="text-xs text-slate-500 mb-2">
              Date-wise summary with <strong>difference amount</strong> and{" "}
              <strong>book-wise details</strong>.
            </p>

            {/* Added overflow-x-auto so table doesn't push page horizontally */}
            <div className="border rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Books Sold</th>
                    <th className="px-4 py-2">Expected Amount</th>
                    <th className="px-4 py-2">Collected</th>
                    <th className="px-4 py-2">Difference</th>
                    <th className="px-4 py-2 text-right">Books</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyAggs.map((day) => {
                    const diff = day.amountCollected - day.expectedAmount;
                    const isExpanded = expandedDate === day.date;
                    const rowsForDay = day.details;

                    return (
                      <Fragment key={day.date}>
                        <tr>
                          <td className="px-4 py-2 text-slate-700">
                            {day.date}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {day.booksSold}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            ₹{day.expectedAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            ₹{day.amountCollected.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <span
                              className={
                                diff === 0
                                  ? "text-slate-600"
                                  : diff > 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }
                            >
                              ₹{diff.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(day.date)}
                              className="text-xs rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                            >
                              {isExpanded ? "Hide Books" : "View Books"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-3 bg-slate-50/60"
                            >
                              <div className="rounded-xl border border-slate-200 bg-white overflow-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50">
                                    <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                                      <th className="px-3 py-1.5">Book</th>
                                      <th className="px-3 py-1.5">
                                        Sold (Qty)
                                      </th>
                                      <th className="px-3 py-1.5">Expected</th>
                                      <th className="px-3 py-1.5">Collected</th>
                                      <th className="px-3 py-1.5">
                                        Difference
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {rowsForDay.map((row) => {
                                      const rowDiff =
                                        row.amountCollected -
                                        row.expectedAmount;
                                      return (
                                        <tr key={row.bookName}>
                                          <td className="px-3 py-1.5 text-slate-800">
                                            {row.bookName}
                                          </td>
                                          <td className="px-3 py-1.5 text-slate-600">
                                            {row.sold}
                                          </td>
                                          <td className="px-3 py-1.5 text-slate-600">
                                            ₹
                                            {row.expectedAmount.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-1.5 text-slate-600">
                                            ₹
                                            {row.amountCollected.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-1.5 text-[11px]">
                                            <span
                                              className={
                                                rowDiff === 0
                                                  ? "text-slate-600"
                                                  : rowDiff > 0
                                                  ? "text-emerald-600"
                                                  : "text-rose-600"
                                              }
                                            >
                                              ₹{rowDiff.toLocaleString()}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {rowsForDay.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={5}
                                          className="px-3 py-3 text-center text-[11px] text-slate-400"
                                        >
                                          No per-book data for this date yet.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {!loading && dailyAggs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-xs text-slate-400"
                      >
                        No trip data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Top Distributed Books (Overall)">
          <ul className="space-y-3">
            {topBooks.map((b) => (
              <li
                key={b.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-slate-800">{b.name}</span>
                <span className="text-xs text-slate-500">{b.sold} copies</span>
              </li>
            ))}
            {topBooks.length === 0 && (
              <li className="text-xs text-slate-400">
                No distribution data yet.
              </li>
            )}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-xl md:text-2xl font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-semibold text-slate-900">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SummaryPill({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
