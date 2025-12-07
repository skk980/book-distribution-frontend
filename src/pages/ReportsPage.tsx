import { useEffect, useMemo, useState } from "react";
import { getTrips, Trip } from "../apis/client";

type BookSummary = {
  bookId: string;
  productName: string;
  totalOut: number;
  totalReturned: number;
  totalSold: number;
  expectedAmount: number;
  amountCollected: number;
};

type BookLogRow = {
  tripId: string;
  date: string;
  distributorName: string;
  quantityOut: number;
  quantityReturn: number;
  quantitySold: number;
  remaining: number;
  expectedAmount: number;
  amountCollected: number;
  difference: number;
};

type DistributorSummary = {
  distributorId: string;
  distributorName: string;
  tripsCount: number;
  booksSold: number;
  expectedAmount: number;
  amountCollected: number;
  cashAmount: number;
  onlineAmount: number;
  difference: number;
};

type DistributorBookRow = {
  tripId: string;
  date: string;
  productName: string;
  totalOut: number;
  totalReturned: number;
  totalSold: number;
  expectedAmount: number;
  amountCollected: number;
  cashAmount: number; // 🔹 NEW
  onlineAmount: number; // 🔹 NEW
};

const normalizeDate = (d?: any) => {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

/** Helper: compute metrics per item, same logic as ActiveTrips page */
const getItemMetrics = (item: any, price: number) => {
  const quantityOut = item.quantityOut ?? 0;
  const quantityReturn = item.quantityReturn ?? 0;

  // Books still with distributor (after returns to admin)
  const itemRemaining = Math.max(quantityOut - quantityReturn, 0);

  // Prefer stored quantitySold; fallback to full remaining if missing
  let rawSold: number;
  if (
    typeof item.quantitySold === "number" &&
    !Number.isNaN(item.quantitySold)
  ) {
    rawSold = item.quantitySold;
  } else {
    rawSold = itemRemaining;
  }

  // clamp sold between 0 and itemRemaining
  const quantitySold = Math.max(0, Math.min(rawSold, itemRemaining));

  // Remaining with distributor (not yet sold)
  const remaining = Math.max(itemRemaining - quantitySold, 0);

  // Expected is based on itemRemaining (Qty Out − Qty Return)
  const expectedAmount = itemRemaining * price;

  const amountCollected = item.amountReturned ?? 0;
  const difference = amountCollected - expectedAmount;

  return {
    quantityOut,
    quantityReturn,
    itemRemaining,
    quantitySold,
    remaining,
    expectedAmount,
    amountCollected,
    difference,
  };
};

export default function ReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [expandedDistributorId, setExpandedDistributorId] = useState<
    string | null
  >(null);

  // Date filter applies only to Per Distributor → Per Book nested rows
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTrips();
        setTrips(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load reports data");
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, []);

  /* -----------------------------
     Overall summary from trips
  ----------------------------- */
  const overall = useMemo(() => {
    let totalSold = 0;
    let totalCollected = 0;
    let totalCash = 0;
    let totalOnline = 0;

    for (const trip of trips) {
      const t: any = trip;
      const cash = t.cashAmount ?? 0;
      const online = t.onlineAmount ?? 0;

      totalCash += cash;
      totalOnline += online;

      for (const item of trip.items as any[]) {
        const bookObj: any = item.book;
        const price = bookObj?.salePrice ?? 0;

        const { quantitySold, amountCollected } = getItemMetrics(item, price);

        totalSold += quantitySold;
        totalCollected += amountCollected;
      }
    }
    return { totalSold, totalCollected, totalCash, totalOnline };
  }, [trips]);

  /* -----------------------------
     Per Book Summary + Logs
  ----------------------------- */

  const {
    bookSummaries,
    bookLogsByBookId,
  }: {
    bookSummaries: BookSummary[];
    bookLogsByBookId: Record<string, BookLogRow[]>;
  } = useMemo(() => {
    const summaryMap = new Map<string, BookSummary>();
    const logsMap: Record<string, BookLogRow[]> = {};

    for (const trip of trips) {
      const distObj: any = (trip as any).distributor;
      const distributorName = distObj?.name || "Unknown Distributor";
      const tripId = (trip as any)._id || "";
      const date = normalizeDate((trip as any).date || (trip as any).createdAt);

      for (const item of trip.items as any[]) {
        const bookObj: any = item.book;
        if (!bookObj || !bookObj._id) continue;

        const bookId = bookObj._id as string;
        const productName = bookObj.productName ?? "Unknown Book";
        const price = bookObj.salePrice ?? 0;

        const {
          quantityOut,
          quantityReturn,
          quantitySold,
          remaining,
          expectedAmount,
          amountCollected,
          difference,
        } = getItemMetrics(item, price);

        // summary
        if (!summaryMap.has(bookId)) {
          summaryMap.set(bookId, {
            bookId,
            productName,
            totalOut: 0,
            totalReturned: 0,
            totalSold: 0,
            expectedAmount: 0,
            amountCollected: 0,
          });
        }
        const agg = summaryMap.get(bookId)!;
        agg.totalOut += quantityOut;
        agg.totalReturned += quantityReturn;
        agg.totalSold += quantitySold;
        agg.expectedAmount += expectedAmount;
        agg.amountCollected += amountCollected;

        // logs
        if (!logsMap[bookId]) logsMap[bookId] = [];
        logsMap[bookId].push({
          tripId,
          date,
          distributorName,
          quantityOut,
          quantityReturn,
          quantitySold,
          remaining,
          expectedAmount,
          amountCollected,
          difference,
        });
      }
    }

    // sort logs by date desc
    Object.values(logsMap).forEach((rows) => {
      rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    });

    const summaryArr = Array.from(summaryMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );

    return { bookSummaries: summaryArr, bookLogsByBookId: logsMap };
  }, [trips]);

  /* -----------------------------
     Per Distributor Summary + details
  ----------------------------- */

  const distributorData = useMemo(() => {
    const summaryMap = new Map<string, DistributorSummary>();
    const rowsByDistId: Record<string, DistributorBookRow[]> = {};

    for (const trip of trips) {
      const distObj: any = (trip as any).distributor;
      const distributorId = distObj?._id || "unknown";
      const distributorName = distObj?.name || "Unknown Distributor";
      const tripId = (trip as any)._id || "";
      const date = normalizeDate(trip.date);
      const t: any = trip;

      if (!summaryMap.has(distributorId)) {
        summaryMap.set(distributorId, {
          distributorId,
          distributorName,
          tripsCount: 0,
          booksSold: 0,
          expectedAmount: 0,
          amountCollected: 0,
          cashAmount: 0,
          onlineAmount: 0,
          difference: 0,
        });
      }
      const agg = summaryMap.get(distributorId)!;
      agg.tripsCount += 1;

      const cash = t.cashAmount ?? 0;
      const online = t.onlineAmount ?? 0;
      agg.cashAmount += cash;
      agg.onlineAmount += online;

      if (!rowsByDistId[distributorId]) rowsByDistId[distributorId] = [];

      for (const item of trip.items as any[]) {
        const bookObj: any = item.book;
        if (!bookObj) continue;

        const productName = bookObj.productName ?? "Unknown Book";
        const price = bookObj.salePrice ?? 0;

        const {
          quantityOut,
          quantityReturn,
          quantitySold,
          expectedAmount,
          amountCollected,
        } = getItemMetrics(item, price);

        agg.booksSold += quantitySold;
        agg.expectedAmount += expectedAmount;
        agg.amountCollected += amountCollected;

        rowsByDistId[distributorId].push({
          tripId,
          date,
          productName,
          totalOut: quantityOut,
          totalReturned: quantityReturn,
          totalSold: quantitySold,
          expectedAmount,
          amountCollected,
          cashAmount: cash, // 🔹 same trip-level cash
          onlineAmount: online, // 🔹 same trip-level online
        });
      }
    }

    const summaries = Array.from(summaryMap.values()).map((s) => ({
      ...s,
      difference: s.amountCollected - s.expectedAmount,
    }));

    summaries.sort((a, b) =>
      a.distributorName.localeCompare(b.distributorName)
    );

    Object.values(rowsByDistId).forEach((rows) =>
      rows.sort((a, b) => (a.date < b.date ? 1 : -1))
    );

    return { summaries, rowsByDistId };
  }, [trips]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "All dates";
    return selectedDate;
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      {loading && (
        <p className="text-xs text-slate-500">Loading reports data...</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {/* Overall summary */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Overall Summary
            </h2>
            <p className="text-xs text-slate-500">
              High-level metrics for all trips till current date (based on trips
              data).
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Books Sold
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {overall.totalSold}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Amount Collected
              </div>
              <div className="text-sm font-semibold text-slate-900">
                ₹{overall.totalCollected.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Cash
              </div>
              <div className="text-sm font-semibold text-slate-900">
                ₹{overall.totalCash.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Total Online
              </div>
              <div className="text-sm font-semibold text-slate-900">
                ₹{overall.totalOnline.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global date filter */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-xs text-slate-500">
              Date filter applies to <strong>Per Distributor → Per Book</strong>{" "}
              nested details.
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
                <th className="px-3 py-2 text-right">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookSummaries.map((b) => {
                const diff = b.amountCollected - b.expectedAmount;
                const isExpanded = expandedBookId === b.bookId;
                const allLogs = bookLogsByBookId[b.bookId] || [];
                const logs =
                  selectedDate.trim().length > 0
                    ? allLogs.filter(
                        (row) => row.date === normalizeDate(selectedDate)
                      )
                    : allLogs;

                return (
                  <>
                    <tr
                      key={b.bookId}
                      onClick={() =>
                        setExpandedBookId((prev) =>
                          prev === b.bookId ? null : b.bookId
                        )
                      }
                      className="cursor-pointer"
                    >
                      <td className="px-3 py-2 text-slate-800">
                        {b.productName}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{b.totalOut}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {b.totalReturned}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {b.totalSold}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{b.expectedAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{b.amountCollected.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs">
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
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBookId((prev) =>
                              prev === b.bookId ? null : b.bookId
                            );
                          }}
                          className="text-[11px] rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                        >
                          {isExpanded ? "Hide Logs" : "View Logs"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-3 py-3 bg-slate-50/60">
                          <div className="rounded-xl border border-slate-200 bg-white overflow-auto">
                            <table className="min-w-full text-[11px] sm:text-xs">
                              <thead className="bg-slate-50">
                                <tr className="text-left text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                  <th className="px-3 py-1.5">Date</th>
                                  <th className="px-3 py-1.5">Distributor</th>
                                  <th className="px-3 py-1.5">Qty Out</th>
                                  <th className="px-3 py-1.5">Qty Returned</th>
                                  <th className="px-3 py-1.5">Remaining</th>
                                  <th className="px-3 py-1.5">Sold</th>
                                  <th className="px-3 py-1.5">
                                    Expected Amount
                                  </th>
                                  <th className="px-3 py-1.5">
                                    Collected Amount
                                  </th>
                                  <th className="px-3 py-1.5">Difference</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {logs.map((row) => (
                                  <tr
                                    key={
                                      row.tripId +
                                      row.date +
                                      row.distributorName
                                    }
                                  >
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {row.date}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-800">
                                      {row.distributorName}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {row.quantityOut}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {row.quantityReturn}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {row.remaining}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      {row.quantitySold}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      ₹{row.expectedAmount.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600">
                                      ₹{row.amountCollected.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                      <span
                                        className={
                                          row.difference === 0
                                            ? "text-slate-600"
                                            : row.difference > 0
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                        }
                                      >
                                        ₹{row.difference.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {logs.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={9}
                                      className="px-3 py-3 text-center text-[11px] text-slate-400"
                                    >
                                      No date-wise logs for this book yet.
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
              {!loading && bookSummaries.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-4 text-center text-xs text-slate-400"
                  >
                    No book distribution data yet.
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
                <th className="px-3 py-2">Cash</th>
                <th className="px-3 py-2">Online</th>
                <th className="px-3 py-2">Difference</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {distributorData.summaries.map((d) => {
                const isExpanded = expandedDistributorId === d.distributorId;
                const allRows =
                  distributorData.rowsByDistId[d.distributorId] || [];

                const filteredRows =
                  selectedDate.trim().length > 0
                    ? allRows.filter(
                        (r) => r.date === normalizeDate(selectedDate)
                      )
                    : allRows;

                return (
                  <>
                    <tr
                      key={d.distributorId}
                      onClick={() =>
                        setExpandedDistributorId((prev) =>
                          prev === d.distributorId ? null : d.distributorId
                        )
                      }
                      className="cursor-pointer"
                    >
                      <td className="px-3 py-2 text-slate-800 font-medium">
                        {d.distributorName}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.tripsCount}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.booksSold}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.expectedAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.amountCollected.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.cashAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ₹{d.onlineAmount.toLocaleString()}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDistributorId((prev) =>
                              prev === d.distributorId ? null : d.distributorId
                            );
                          }}
                          className="text-[11px] rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                        >
                          {isExpanded ? "Hide Books" : "View Books"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-3 py-3 bg-slate-50/60">
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
                                  <th className="px-3 py-1.5">Cash</th>
                                  <th className="px-3 py-1.5">Online</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredRows.map((bRow) => {
                                  return (
                                    <tr
                                      key={
                                        bRow.tripId +
                                        bRow.date +
                                        bRow.productName
                                      }
                                    >
                                      <td className="px-3 py-1.5 text-slate-600">
                                        {bRow.date}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-800">
                                        {bRow.productName}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        {bRow.totalOut}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        {bRow.totalReturned}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        {bRow.totalSold}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        ₹{bRow.expectedAmount.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        ₹{bRow.amountCollected.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        ₹{bRow.cashAmount.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-600">
                                        ₹{bRow.onlineAmount.toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {filteredRows.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={9}
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
              {!loading && distributorData.summaries.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-4 text-center text-xs text-slate-400"
                  >
                    No distributor data yet.
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
