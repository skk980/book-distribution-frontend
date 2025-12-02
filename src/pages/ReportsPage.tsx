import { useEffect, useMemo, useState } from "react";
import {
  SummaryReport,
  BookReport,
  DistributorReport,
  DistributorBookReport,
  getSummaryReport,
  getBookReports,
  getDistributorReports,
  getDistributorBookReports,
} from "../apis/client";

export default function ReportsPage() {
  const [overall, setOverall] = useState<SummaryReport | null>(null);
  const [bookReports, setBookReports] = useState<BookReport[]>([]);
  const [distributorReports, setDistributorReports] = useState<
    DistributorReport[]
  >([]);

  const [expandedDistributorId, setExpandedDistributorId] = useState<
    string | null
  >(null);

  const [selectedDate, setSelectedDate] = useState<string>("");

  const [perDistributorBooks, setPerDistributorBooks] = useState<
    Record<string, DistributorBookReport[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [loadingDistributorId, setLoadingDistributorId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Load overall + book + distributor reports
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overallRes, booksRes, distRes] = await Promise.all([
        getSummaryReport(),
        getBookReports(),
        getDistributorReports(),
      ]);
      setOverall(overallRes);
      setBookReports(booksRes);
      setDistributorReports(distRes);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // When date changes, clear per-distributor cached data & collapse
  useEffect(() => {
    setPerDistributorBooks({});
    setExpandedDistributorId(null);
  }, [selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "All dates";
    return selectedDate;
  }, [selectedDate]);

  const handleToggleDistributor = async (d: DistributorReport) => {
    const id = d.distributorId;
    if (expandedDistributorId === id) {
      setExpandedDistributorId(null);
      return;
    }

    setExpandedDistributorId(id);
    const key = `${id}-${selectedDate || "all"}`;

    if (perDistributorBooks[key]) {
      return; // already loaded for this date
    }

    try {
      setLoadingDistributorId(id);
      const data = await getDistributorBookReports(
        id,
        selectedDate || undefined
      );
      setPerDistributorBooks((prev) => ({
        ...prev,
        [key]: data,
      }));
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load distributor details"
      );
    } finally {
      setLoadingDistributorId(null);
    }
  };

  const totalBooksSold = overall?.totalBooksSold ?? 0;
  const totalAmountCollected = overall?.amountCollected ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}
      {loading && <p className="text-xs text-slate-500">Loading reports...</p>}

      {/* Overall summary */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Overall Summary
            </h2>
            <p className="text-xs text-slate-500">
              High-level metrics for all trips till current date.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Books Sold
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {totalBooksSold.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Amount Collected
              </div>
              <div className="text-sm font-semibold text-slate-900">
                ₹{totalAmountCollected.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global date filter (for per-distributor drilldown) */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-xs text-slate-500">
              Date filter applies to <strong>Per Distributor → Per Book</strong>{" "}
              details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600">
                Date (optional)
              </label>
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/60"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="mt-4 md:mt-6 text-xs text-slate-500 hover:text-slate-700"
              >
                Clear date
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Per Book Summary (overall) */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Per Book Summary (Overall)
        </h2>
        <div className="overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2">Book</th>
                <th className="px-3 py-2">Total Out</th>
                <th className="px-3 py-2">Total Returned</th>
                <th className="px-3 py-2">Total Sold</th>
                <th className="px-3 py-2">Expected Amount</th>
                <th className="px-3 py-2">Collected</th>
                <th className="px-3 py-2">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookReports.map((b) => {
                const difference = b.amountCollected - b.expectedAmount;
                return (
                  <tr key={b.bookId}>
                    <td className="px-3 py-2 text-slate-800">
                      {b.productName}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{b.totalOut}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {b.totalReturned}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{b.totalSold}</td>
                    <td className="px-3 py-2 text-slate-600">
                      ₹{b.expectedAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      ₹{b.amountCollected.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          difference === 0
                            ? "text-slate-600"
                            : difference > 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        ₹{difference.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && bookReports.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-xs text-slate-400"
                  >
                    No book report data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per Distributor Summary + per-book drill down (date-wise) */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Per Distributor Summary
          </h2>
          <span className="text-[11px] text-slate-500">
            Per-book details filtered by:{" "}
            <span className="font-medium text-slate-700">
              {selectedDateLabel}
            </span>
          </span>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2">Distributor</th>
                <th className="px-3 py-2">Trips</th>
                <th className="px-3 py-2">Books Sold</th>
                <th className="px-3 py-2">Expected</th>
                <th className="px-3 py-2">Collected</th>
                <th className="px-3 py-2">Difference</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {distributorReports.map((d) => {
                const isExpanded = expandedDistributorId === d.distributorId;
                const key = `${d.distributorId}-${selectedDate || "all"}`;
                const perBook = perDistributorBooks[key] || [];

                return (
                  <>
                    <tr key={d.distributorId}>
                      <td className="px-3 py-2 text-slate-800 font-medium">
                        {d.name}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{d.trips}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.booksSold}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.expectedAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.amountCollected.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={
                            d.difference === 0
                              ? "text-slate-600"
                              : d.difference > 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                        >
                          ₹{d.difference.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleDistributor(d)}
                          className="text-[11px] rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                        >
                          {isExpanded ? "Hide Books" : "View Books"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 bg-slate-50/60">
                          <div className="rounded-xl border border-slate-200 bg-white overflow-auto">
                            <table className="min-w-full text-[11px] sm:text-xs">
                              <thead className="bg-slate-50">
                                <tr className="text-left text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                  <th className="px-3 py-1.5">Date</th>
                                  <th className="px-3 py-1.5">Book</th>
                                  <th className="px-3 py-1.5">Total Out</th>
                                  <th className="px-3 py-1.5">
                                    Total Returned
                                  </th>
                                  <th className="px-3 py-1.5">Total Sold</th>
                                  <th className="px-3 py-1.5">
                                    Expected Amount
                                  </th>
                                  <th className="px-3 py-1.5">Collected</th>
                                  <th className="px-3 py-1.5">Difference</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {perBook.map((b) => (
                                  <tr key={b.id}>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {b.date}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-800">
                                      {b.productName}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {b.totalOut}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {b.totalReturned}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {b.totalSold}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      ₹{b.expectedAmount.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      ₹{b.amountCollected.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                      <span
                                        className={
                                          b.difference === 0
                                            ? "text-slate-600"
                                            : b.difference > 0
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                        }
                                      >
                                        ₹{b.difference.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {loadingDistributorId === d.distributorId && (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      className="px-3 py-3 text-center text-[11px] text-slate-400"
                                    >
                                      Loading per-book details...
                                    </td>
                                  </tr>
                                )}
                                {loadingDistributorId !== d.distributorId &&
                                  perBook.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="px-3 py-3 text-center text-[11px] text-slate-400"
                                      >
                                        No per-book data for this distributor on
                                        this date.
                                      </td>
                                    </tr>
                                  )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {!loading && distributorReports.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-slate-400"
                  >
                    No distributor report data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
