import { useEffect, useMemo, useState } from "react";
import { Trip, TripItem, getTrips, updateTripReturns } from "../apis/client";

type TripStatus = "Out" | "Completed";

export default function ActiveTripsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrips(selectedDate);
      setTrips(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleItemChange = (
    tripId: string,
    index: number,
    field: "quantityReturn" | "amountReturned" | "differenceReason",
    value: number | string
  ) => {
    setTrips((prev) =>
      prev.map((trip) =>
        trip._id === tripId
          ? {
              ...trip,
              items: trip.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
              ),
            }
          : trip
      )
    );
  };

  const computeTripSummary = (trip: Trip) => {
    return trip.items.reduce(
      (acc, item) => {
        const sold = Math.max(item.quantityOut - (item.quantityReturn || 0), 0);
        const price =
          typeof item.book === "object" && item.book
            ? (item.book as any).salePrice || 0
            : 0;
        const expected = sold * price;
        const diff = (item.amountReturned || 0) - expected;

        acc.booksOut += item.quantityOut;
        acc.booksReturn += item.quantityReturn || 0;
        acc.booksSold += sold;
        acc.expectedAmount += expected;
        acc.amountReturned += item.amountReturned || 0;
        acc.difference += diff;
        return acc;
      },
      {
        booksOut: 0,
        booksReturn: 0,
        booksSold: 0,
        expectedAmount: 0,
        amountReturned: 0,
        difference: 0,
      }
    );
  };

  const getTripStatus = (trip: Trip): TripStatus => {
    if (trip.status === "COMPLETED") return "Completed";
    return "Out";
  };

  const pageSummary = useMemo(() => {
    return trips.reduce(
      (acc, trip) => {
        const sum = computeTripSummary(trip);
        acc.trips += 1;
        acc.booksOut += sum.booksOut;
        acc.booksReturn += sum.booksReturn;
        acc.booksSold += sum.booksSold;
        acc.expectedAmount += sum.expectedAmount;
        acc.amountReturned += sum.amountReturned;
        acc.difference += sum.difference;
        return acc;
      },
      {
        trips: 0,
        booksOut: 0,
        booksReturn: 0,
        booksSold: 0,
        expectedAmount: 0,
        amountReturned: 0,
        difference: 0,
      }
    );
  }, [trips]);

  const handleSaveTripReturns = async (trip: Trip) => {
    try {
      setSavingTripId(trip._id);
      setError(null);

      const itemsPayload = trip.items.map((item: TripItem) => {
        const bookId =
          typeof item.book === "string" ? item.book : (item.book as any)._id;
        const boxId =
          typeof item.box === "string" ? item.box : (item.box as any)._id;

        return {
          bookId,
          boxId,
          quantityReturn: item.quantityReturn || 0,
          amountReturned: item.amountReturned || 0,
          differenceReason: item.differenceReason || "",
        };
      });

      await updateTripReturns(trip._id, itemsPayload);
      await loadTrips();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save returns");
    } finally {
      setSavingTripId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Active Trips / Returns & Amounts
      </h1>

      {/* Filters + summary */}
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs md:text-sm">
            <SummaryChip label="Trips" value={pageSummary.trips} />
            <SummaryChip label="Books Out" value={pageSummary.booksOut} />
            <SummaryChip
              label="Books Returned"
              value={pageSummary.booksReturn}
            />
            <SummaryChip label="Books Sold" value={pageSummary.booksSold} />
            <SummaryChip
              label="Expected Amount"
              value={`₹${pageSummary.expectedAmount.toLocaleString()}`}
            />
            <SummaryChip
              label="Amount Returned"
              value={`₹${pageSummary.amountReturned.toLocaleString()}`}
            />
            <SummaryChip
              label="Difference"
              value={`₹${pageSummary.difference.toLocaleString()}`}
              valueClass={
                pageSummary.difference === 0
                  ? "text-slate-700"
                  : pageSummary.difference > 0
                  ? "text-emerald-700"
                  : "text-rose-700"
              }
            />
          </div>
        </div>

        {loading && <p className="text-xs text-slate-500">Loading trips...</p>}
        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
            {error}
          </p>
        )}
      </section>

      {/* Trips list */}
      <section className="space-y-3">
        {trips.length === 0 && !loading && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-sm text-slate-500">
            No trips found for this date.
          </div>
        )}

        {trips.map((trip) => {
          const summary = computeTripSummary(trip);
          const status = getTripStatus(trip);
          const isExpanded = expandedTripId === trip._id;

          const distributorName =
            typeof trip.distributor === "object" && trip.distributor
              ? (trip.distributor as any).name
              : "Distributor";

          return (
            <div
              key={trip._id}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm"
            >
              {/* Trip header row */}
              <button
                type="button"
                onClick={() => setExpandedTripId(isExpanded ? null : trip._id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {distributorName}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Books Out: {summary.booksOut} • Returned:{" "}
                    {summary.booksReturn} • Sold: {summary.booksSold}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-xs">
                  <span className="text-slate-500">
                    Expected: ₹{summary.expectedAmount.toLocaleString()}
                  </span>
                  <span className="text-slate-500">
                    Returned: ₹{summary.amountReturned.toLocaleString()}
                  </span>
                  <span
                    className={
                      summary.difference === 0
                        ? "text-slate-600"
                        : summary.difference > 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }
                  >
                    Diff: ₹{summary.difference.toLocaleString()}
                  </span>
                </div>
              </button>

              {/* Expanded detail: per-book returns */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                  <p className="text-xs text-slate-500">
                    Update{" "}
                    <strong>
                      book-wise returns, sold, amount, and reasons
                    </strong>{" "}
                    for this distributor. This clearly shows what books are
                    returned.
                  </p>

                  <div className="overflow-auto rounded-xl border border-slate-100">
                    <table className="min-w-full text-[11px] sm:text-xs md:text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                          <th className="px-3 py-2">Book</th>
                          <th className="px-3 py-2">Box</th>
                          <th className="px-3 py-2">Price</th>
                          <th className="px-3 py-2">Qty Out</th>
                          <th className="px-3 py-2">Qty Return</th>
                          <th className="px-3 py-2">Sold</th>
                          <th className="px-3 py-2">Expected</th>
                          <th className="px-3 py-2">Amount Returned</th>
                          <th className="px-3 py-2">Difference</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trip.items.map((item, index) => {
                          const price =
                            typeof item.book === "object" && item.book
                              ? (item.book as any).salePrice || 0
                              : 0;
                          const sold = Math.max(
                            item.quantityOut - (item.quantityReturn || 0),
                            0
                          );
                          const expected = sold * price;
                          const diff = (item.amountReturned || 0) - expected;

                          const bookName =
                            typeof item.book === "object" && item.book
                              ? (item.book as any).productName
                              : "Book";
                          const boxName =
                            typeof item.box === "object" && item.box
                              ? (item.box as any).boxName
                              : "Box";

                          return (
                            <tr key={index}>
                              <td className="px-3 py-2 text-slate-800">
                                {bookName}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {boxName}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                ₹{price}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {item.quantityOut}
                              </td>
                              {/* Qty Return (editable) */}
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                  value={item.quantityReturn || 0}
                                  onChange={(e) =>
                                    handleItemChange(
                                      trip._id,
                                      index,
                                      "quantityReturn",
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              {/* Sold (auto) */}
                              <td className="px-3 py-2 text-slate-600">
                                {sold}
                              </td>
                              {/* Expected amount (auto) */}
                              <td className="px-3 py-2 text-slate-600">
                                ₹{expected}
                              </td>
                              {/* Amount returned (editable) */}
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                  value={item.amountReturned || 0}
                                  onChange={(e) =>
                                    handleItemChange(
                                      trip._id,
                                      index,
                                      "amountReturned",
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              {/* Difference (auto) */}
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
                                  ₹{diff}
                                </span>
                              </td>
                              {/* Reason (editable) */}
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                  placeholder="Discount / free / shortage..."
                                  value={item.differenceReason || ""}
                                  onChange={(e) =>
                                    handleItemChange(
                                      trip._id,
                                      index,
                                      "differenceReason",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save button for this trip */}
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={() => handleSaveTripReturns(trip)}
                      disabled={savingTripId === trip._id}
                      className="inline-flex items-center rounded-xl bg-slate-900 text-white text-xs md:text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingTripId === trip._id
                        ? "Saving..."
                        : `Save Returns for ${distributorName}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: TripStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium";
  if (status === "Completed") {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        Completed
      </span>
    );
  }
  return <span className={`${base} bg-amber-50 text-amber-700`}>Out</span>;
}
