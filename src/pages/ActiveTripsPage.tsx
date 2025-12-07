import { useEffect, useMemo, useState } from "react";
import { Trip, getTrips, updateTripReturns, deleteTrip } from "../apis/client";
import { message } from "antd";

type TripStatus = "ACTIVE" | "COMPLETED" | "UNKNOWN";

const normalizeDate = (d?: any) => {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const todayStr = new Date().toISOString().slice(0, 10);

type TripGroup = {
  groupName: string | null;
  date: string;
  trips: Trip[];
};

/** Safely get distributor name(s) */
const getDistributorName = (trip: any) => {
  // Normal single distributor (your current main case)
  if (
    trip.distributor &&
    typeof trip.distributor === "object" &&
    trip.distributor.name
  ) {
    return trip.distributor.name;
  }

  // Only if distributors is an array of *objects with name* (not plain ids)
  if (Array.isArray(trip.distributors) && trip.distributors.length > 0) {
    const names = trip.distributors
      .map((d: any) => (d && typeof d === "object" ? d.name : null))
      .filter(Boolean);

    if (names.length > 0) {
      return names.join(", ");
    }
  }

  return "Unknown Distributor";
};

export default function ActiveTripsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrips();
      setTrips(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const tripsForDate = useMemo(
    () =>
      trips.filter(
        (t) => normalizeDate((t as any).date) === normalizeDate(selectedDate)
      ),
    [trips, selectedDate]
  );

  const getSoldForItem = (item: any) => {
    const qtyOut = item.quantityOut ?? 0;
    const qtyRet = item.quantityReturn ?? 0;
    const itemRemaining = Math.max(qtyOut - qtyRet, 0);

    const rawSold =
      typeof item.quantitySold === "number" && !Number.isNaN(item.quantitySold)
        ? item.quantitySold
        : 0;

    const safeSold = Math.max(0, Math.min(rawSold, itemRemaining));
    return safeSold;
  };

  const computeTripSummary = (trip: Trip) => {
    return (trip.items as any[]).reduce(
      (acc, item: any) => {
        const qtyOut = item.quantityOut ?? 0;
        const qtyRet = item.quantityReturn ?? 0;
        const itemRemaining = Math.max(qtyOut - qtyRet, 0);
        const quantitySold = getSoldForItem(item);
        const price = item.book?.salePrice ?? 0;

        const expected = itemRemaining * price;
        const returnedAmt = item.amountReturned ?? 0;
        const diff = returnedAmt - expected;

        acc.booksOut += qtyOut;
        acc.booksReturn += qtyRet;
        acc.booksSold += quantitySold;
        acc.expectedAmount += expected;
        acc.amountReturned += returnedAmt;
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

  const pageSummary = useMemo(() => {
    return tripsForDate.reduce(
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
  }, [tripsForDate]);

  const getTripStatus = (trip: Trip): TripStatus => {
    if (trip.status === "COMPLETED") return "COMPLETED";
    if (trip.status === "OUT") return "ACTIVE";
    return "UNKNOWN";
  };

  // Group trips by (groupName + date) for group UI
  const groupedTrips = useMemo<TripGroup[]>(() => {
    const map = new Map<string, TripGroup>();

    tripsForDate.forEach((trip) => {
      const t: any = trip;
      const gName = (t.groupName || "").trim();
      const key = gName ? `group:${gName}_${t.date}` : `single:${t._id}`;

      if (!map.has(key)) {
        map.set(key, {
          groupName: gName || null,
          date: t.date,
          trips: [],
        });
      }
      map.get(key)!.trips.push(trip);
    });

    return Array.from(map.values());
  }, [tripsForDate]);

  const handleItemChange = (
    tripId: string,
    itemIndex: number,
    field:
      | "quantityOut"
      | "quantityReturn"
      | "amountReturned"
      | "differenceReason"
      | "sold",
    value: number | string
  ) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if ((trip as any)._id !== tripId) return trip;
        const nextItems = (trip.items as any[]).map((it: any, idx: number) =>
          idx === itemIndex ? { ...it, [field]: value } : it
        );
        return { ...trip, items: nextItems } as Trip;
      })
    );
  };

  const handleItemSoldChange = (
    tripId: string,
    itemIndex: number,
    rawValue: string
  ) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if ((trip as any)._id !== tripId) return trip;

        const nextItems = (trip.items as any[]).map((it: any, idx: number) => {
          if (idx !== itemIndex) return it;

          const qtyOut = it.quantityOut ?? 0;
          const qtyRet = it.quantityReturn ?? 0;
          const itemRemaining = Math.max(qtyOut - qtyRet, 0);

          if (rawValue === "") {
            return {
              ...it,
              quantitySold: 0,
            };
          }

          let parsed = Number(rawValue);
          if (Number.isNaN(parsed)) parsed = 0;

          const safeSold = Math.max(0, Math.min(parsed, itemRemaining));

          return {
            ...it,
            quantitySold: safeSold,
          };
        });

        return { ...trip, items: nextItems } as Trip;
      })
    );
  };

  const handleQtyOutChange = (
    tripId: string,
    itemIndex: number,
    rawValue: string
  ) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if ((trip as any)._id !== tripId) return trip;

        const nextItems = (trip.items as any[]).map((it: any, idx: number) => {
          if (idx !== itemIndex) return it;

          let newQtyOut: number;
          if (rawValue === "") {
            newQtyOut = 0;
          } else {
            const parsed = Number(rawValue);
            newQtyOut = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
          }

          const qtyRet = it.quantityReturn ?? 0;
          const itemRemaining = Math.max(newQtyOut - qtyRet, 0);

          const currentSold =
            typeof it.quantitySold === "number" &&
            !Number.isNaN(it.quantitySold)
              ? it.quantitySold
              : 0;
          const safeSold = Math.max(0, Math.min(currentSold, itemRemaining));

          return {
            ...it,
            quantityOut: newQtyOut,
            quantitySold: safeSold,
          };
        });

        return { ...trip, items: nextItems } as Trip;
      })
    );
  };

  const handleSaveTripReturns = async (trip: Trip) => {
    const tripId = (trip as any)._id as string;
    try {
      setSavingTripId(tripId);
      setError(null);

      const payloadItems = (trip.items as any[]).map((item: any) => ({
        bookId:
          typeof item.book === "string"
            ? item.book
            : item.book?._id || item.book,
        quantityOut: item.quantityOut ?? 0,
        quantityReturn: item.quantityReturn ?? 0,
        quantitySold: item.quantitySold ?? 0,
        amountReturned: item.amountReturned ?? 0,
        differenceReason: item.differenceReason ?? "",
      }));

      await updateTripReturns(tripId, payloadItems);
      message.success("Saved");
      await loadTrips();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to save trip returns/amounts"
      );
    } finally {
      setSavingTripId(null);
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    const tripId = (trip as any)._id as string;
    const distributorName = getDistributorName(trip as any);

    const ok = window.confirm(
      `Are you sure you want to delete this trip for ${distributorName}?`
    );
    if (!ok) return;

    try {
      setDeletingTripId(tripId);
      setError(null);
      await deleteTrip(tripId);
      setTrips((prev) => prev.filter((t: any) => t._id !== tripId));
      if (expandedTripId === tripId) setExpandedTripId(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete trip");
    } finally {
      setDeletingTripId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Active Trips / Returns & Amounts
      </h1>

      {loading && (
        <p className="text-xs text-slate-500">Loading trips for this date...</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}

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
      </section>

      {/* Grouped trips list */}
      <section className="space-y-3">
        {groupedTrips.length === 0 && !loading && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-sm text-slate-500">
            No trips found for this date.
          </div>
        )}

        {groupedTrips.map((group, index) => {
          const isGroup =
            group.groupName && group.trips && group.trips.length > 1;

          const groupSummary = group.trips.reduce(
            (acc, trip) => {
              const sum = computeTripSummary(trip);
              acc.booksOut += sum.booksOut;
              acc.booksReturn += sum.booksReturn;
              acc.booksSold += sum.booksSold;
              acc.expectedAmount += sum.expectedAmount;
              acc.amountReturned += sum.amountReturned;
              acc.difference += sum.difference;
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

          const firstTrip: any = group.trips[0] || {};
          const groupLabel = isGroup
            ? group.groupName || `Group #${index + 1}`
            : getDistributorName(firstTrip);

          return (
            <div
              key={(group.groupName || "single") + "_" + index}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm"
            >
              {/* Group header */}
              {isGroup && (
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-1 md:flex-row md:items-center md:justify-between bg-slate-50/70">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Group Trip
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {groupLabel} — {group.trips.length} distributors
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] md:text-xs text-slate-600">
                    <span>Out: {groupSummary.booksOut}</span>
                    <span>Returned: {groupSummary.booksReturn}</span>
                    <span>Sold: {groupSummary.booksSold}</span>
                    <span>
                      Expected: ₹{groupSummary.expectedAmount.toLocaleString()}
                    </span>
                    <span>
                      Collected: ₹{groupSummary.amountReturned.toLocaleString()}
                    </span>
                    <span
                      className={
                        groupSummary.difference === 0
                          ? "text-slate-600"
                          : groupSummary.difference > 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      Diff: ₹{groupSummary.difference.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Inner distributor trips */}
              <div className="divide-y divide-slate-100">
                {group.trips.map((trip) => {
                  const tripId = (trip as any)._id as string;
                  const summary = computeTripSummary(trip);
                  const status = getTripStatus(trip);
                  const isExpanded = expandedTripId === tripId;
                  const distributorName = getDistributorName(trip as any);

                  return (
                    <div key={tripId}>
                      {/* Trip header for each distributor in this group */}
                      <div className="flex items-stretch justify-between px-4 py-3 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTripId(isExpanded ? null : tripId)
                          }
                          className="flex-1 flex items-center justify-between text-left"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900">
                                {distributorName}
                              </span>
                              {isGroup && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  Group: {groupLabel}
                                </span>
                              )}
                              <StatusBadge status={status} />
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Books Out: {summary.booksOut} • Returned:{" "}
                              {summary.booksReturn} • Sold: {summary.booksSold}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 text-xs">
                            <span className="text-slate-500">
                              Expected: ₹
                              {summary.expectedAmount.toLocaleString()}
                            </span>
                            <span className="text-slate-500">
                              Returned: ₹
                              {summary.amountReturned.toLocaleString()}
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

                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(trip)}
                          className="self-center text-[11px] rounded-lg border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50"
                          disabled={deletingTripId === tripId}
                        >
                          {deletingTripId === tripId ? "Deleting..." : "Delete"}
                        </button>
                      </div>

                      {/* Expanded per-book editable table */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                          <p className="text-xs text-slate-500">
                            Update{" "}
                            <strong>
                              qty out, qty return, sold, amount, and reasons
                            </strong>{" "}
                            for this distributor. Expected is based on{" "}
                            <strong>Qty Out − Qty Return</strong>, Remaining is{" "}
                            <strong>item remaining − sold</strong>.
                          </p>

                          <div className="overflow-auto rounded-xl border border-slate-100">
                            <table className="min-w-full text-[11px] sm:text-xs md:text-sm">
                              <thead className="bg-slate-50">
                                <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                                  <th className="px-3 py-2">Book</th>
                                  <th className="px-3 py-2">Price</th>
                                  <th className="px-3 py-2">Qty Out</th>
                                  <th className="px-3 py-2">Qty Return</th>
                                  <th className="px-3 py-2">Remaining</th>
                                  <th className="px-3 py-2">Sold</th>
                                  <th className="px-3 py-2">Expected</th>
                                  <th className="px-3 py-2">Amount Returned</th>
                                  <th className="px-3 py-2">Difference</th>
                                  <th className="px-3 py-2">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(trip.items as any[]).map(
                                  (item: any, idx: number) => {
                                    const qtyOut = item.quantityOut ?? 0;
                                    const qtyRet = item.quantityReturn ?? 0;
                                    const itemRemaining = Math.max(
                                      qtyOut - qtyRet,
                                      0
                                    );
                                    const quantitySold = getSoldForItem(item);
                                    const remaining = Math.max(
                                      itemRemaining - quantitySold,
                                      0
                                    );
                                    const price = item.book?.salePrice ?? 0;
                                    const expected = itemRemaining * price;
                                    const returnedAmt =
                                      item.amountReturned ?? 0;
                                    const diff = returnedAmt - expected;

                                    return (
                                      <tr key={item._id || idx}>
                                        <td className="px-3 py-2 text-slate-800">
                                          {item.book?.productName || "Unknown"}
                                        </td>

                                        <td className="px-3 py-2 text-slate-600">
                                          ₹{price}
                                        </td>

                                        {/* Qty Out */}
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                            value={qtyOut}
                                            onChange={(e) =>
                                              handleQtyOutChange(
                                                tripId,
                                                idx,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>

                                        {/* Qty Return */}
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                            value={qtyRet}
                                            onChange={(e) =>
                                              handleItemChange(
                                                tripId,
                                                idx,
                                                "quantityReturn",
                                                e.target.value === ""
                                                  ? 0
                                                  : Number(e.target.value)
                                              )
                                            }
                                          />
                                        </td>

                                        {/* Remaining */}
                                        <td className="px-3 py-2 text-slate-600">
                                          {remaining}
                                        </td>

                                        {/* Sold */}
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                            value={quantitySold}
                                            onChange={(e) =>
                                              handleItemSoldChange(
                                                tripId,
                                                idx,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>

                                        {/* Expected */}
                                        <td className="px-3 py-2 text-slate-600">
                                          ₹{expected}
                                        </td>

                                        {/* Amount Returned */}
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                            value={returnedAmt}
                                            onChange={(e) =>
                                              handleItemChange(
                                                tripId,
                                                idx,
                                                "amountReturned",
                                                e.target.value === ""
                                                  ? 0
                                                  : Number(e.target.value)
                                              )
                                            }
                                          />
                                        </td>

                                        {/* Difference */}
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

                                        {/* Reason */}
                                        <td className="px-3 py-2">
                                          <input
                                            type="text"
                                            className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                                            placeholder="Discount / free / shortage..."
                                            value={item.differenceReason || ""}
                                            onChange={(e) =>
                                              handleItemChange(
                                                tripId,
                                                idx,
                                                "differenceReason",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex justify-end mt-3 gap-3">
                            <button
                              type="button"
                              onClick={() => handleSaveTripReturns(trip)}
                              disabled={savingTripId === tripId}
                              className="inline-flex items-center rounded-xl bg-slate-900 text-white text-xs md:text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
                            >
                              {savingTripId === tripId
                                ? "Saving..."
                                : `Save Returns for ${distributorName}`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
  if (status === "COMPLETED") {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        Completed
      </span>
    );
  }
  if (status === "ACTIVE") {
    return <span className={`${base} bg-amber-50 text-amber-700`}>Active</span>;
  }
  return (
    <span className={`${base} bg-slate-50 text-slate-500`}>
      {status || "Unknown"}
    </span>
  );
}
