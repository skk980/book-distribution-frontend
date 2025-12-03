import { useEffect, useMemo, useState } from "react";
import {
  Book,
  Distributor,
  getBooks,
  getDistributors,
  createTrip,
} from "../apis/client";

type TripItemForm = {
  id: number;
  bookId: string | "";
  quantityOut: number | "";
  quantityReturn: number | ""; // kept for computation compatibility (0 for new trips)
  amountReturned: number | "";
  differenceReason: string;
};

type TripForm = {
  distributorId: string | "";
  date: string;
  remarks: string;
  items: TripItemForm[];
};

let itemIdCounter = 1;

export default function TripsPage() {
  const [tripForm, setTripForm] = useState<TripForm>({
    distributorId: "",
    date: new Date().toISOString().slice(0, 10),
    remarks: "",
    items: [],
  });

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load master data
  const loadMasters = async () => {
    try {
      setLoading(true);
      setError(null);
      const [distRes, booksRes] = await Promise.all([
        getDistributors(),
        getBooks(),
      ]);
      setDistributors(distRes);
      setBooks(booksRes);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load trip data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const handleChangeTripField = (
    field: keyof TripForm,
    value: TripForm[typeof field]
  ) => {
    setTripForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddItem = () => {
    setTripForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: itemIdCounter++,
          bookId: "",
          quantityOut: "",
          quantityReturn: "",
          amountReturned: "",
          differenceReason: "",
        },
      ],
    }));
  };

  const handleRemoveItem = (id: number) => {
    setTripForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleItemChange = <K extends keyof TripItemForm>(
    id: number,
    field: K,
    value: TripItemForm[K]
  ) => {
    setTripForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const getBookById = (id: string | "") =>
    typeof id === "string" && id
      ? books.find((b) => b._id === id) ?? null
      : null;

  const rowComputed = (item: TripItemForm) => {
    const book = getBookById(item.bookId);
    const quantityOut =
      typeof item.quantityOut === "number" ? item.quantityOut : 0;
    const quantityReturn =
      typeof item.quantityReturn === "number" ? item.quantityReturn : 0;
    const sold = Math.max(quantityOut - quantityReturn, 0);
    const price = book?.salePrice ?? 0;
    const expectedAmount = sold * price;
    const amountReturned =
      typeof item.amountReturned === "number" ? item.amountReturned : 0;
    const difference = amountReturned - expectedAmount;

    return {
      book,
      sold,
      expectedAmount,
      difference,
    };
  };

  const summary = useMemo(() => {
    return tripForm.items.reduce(
      (acc, item) => {
        const { sold, expectedAmount, difference } = rowComputed(item);
        const quantityOut =
          typeof item.quantityOut === "number" ? item.quantityOut : 0;
        const quantityReturn =
          typeof item.quantityReturn === "number" ? item.quantityReturn : 0;
        const amountReturned =
          typeof item.amountReturned === "number" ? item.amountReturned : 0;

        acc.totalBooksOut += quantityOut;
        acc.totalBooksReturn += quantityReturn;
        acc.totalBooksSold += sold;
        acc.expectedAmount += expectedAmount;
        acc.amountReturned += amountReturned;
        acc.difference += difference;

        return acc;
      },
      {
        totalBooksOut: 0,
        totalBooksReturn: 0,
        totalBooksSold: 0,
        expectedAmount: 0,
        amountReturned: 0,
        difference: 0,
      }
    );
  }, [tripForm.items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tripForm.distributorId) {
      alert("Please select a distributor.");
      return;
    }

    if (!tripForm.date) {
      alert("Please select a date.");
      return;
    }

    if (tripForm.items.length === 0) {
      alert("Please add at least one book item.");
      return;
    }

    for (const item of tripForm.items) {
      if (!item.bookId) {
        alert("Each row must have Book selected.");
        return;
      }
      if (!item.quantityOut || item.quantityOut <= 0) {
        alert("Each row must have a valid Quantity Out.");
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        distributor: tripForm.distributorId,
        date: tripForm.date,
        remarks: tripForm.remarks || undefined,
        items: tripForm.items.map((item) => ({
          book: item.bookId,
          quantityOut:
            typeof item.quantityOut === "number" ? item.quantityOut : 0,
        })),
      };

      await createTrip(payload);

      alert("Trip saved successfully!");
      handleReset();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save trip");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTripForm({
      distributorId: "",
      date: new Date().toISOString().slice(0, 10),
      remarks: "",
      items: [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          Distribution Trips
        </h1>
        <p className="text-xs md:text-sm text-slate-500 max-w-md">
          Create a distribution trip. Select books from master list and enter
          quantities going out. Returns and amounts will be updated later in
          Active Trips.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-slate-500">
          Loading distributors & books...
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl bg-white border border-slate-100 shadow-sm p-4 md:p-6"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Trip Info</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Distributor <span className="text-rose-500">*</span>
              </label>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/70 outline-none"
                value={tripForm.distributorId}
                onChange={(e) =>
                  handleChangeTripField("distributorId", e.target.value || "")
                }
              >
                <option value="">Select distributor</option>
                {distributors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/70 outline-none"
                value={tripForm.date}
                onChange={(e) => handleChangeTripField("date", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs font-medium text-slate-600">
                Remarks
              </label>
              <input
                type="text"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/70 outline-none"
                placeholder="Optional notes..."
                value={tripForm.remarks}
                onChange={(e) =>
                  handleChangeTripField("remarks", e.target.value)
                }
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Books in this Trip
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center rounded-xl bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
            >
              + Add Row
            </button>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2 min-w-[160px]">Book</th>
                  <th className="px-3 py-2 min-w-[120px]">Subcategory</th>
                  <th className="px-3 py-2 min-w-[80px]">Price</th>
                  <th className="px-3 py-2 min-w-[80px]">Qty Out</th>
                  <th className="px-3 py-2 min-w-[80px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tripForm.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      No items yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                )}

                {tripForm.items.map((item) => {
                  const { book } = rowComputed(item);

                  return (
                    <tr key={item.id} className="align-top">
                      {/* Book select */}
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                          value={item.bookId}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "bookId",
                              e.target.value || ""
                            )
                          }
                        >
                          <option value="">Select book</option>
                          {books.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.productName}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Subcategory */}
                      <td className="px-3 py-2 text-slate-500">
                        <div className="text-xs">
                          {book?.subcategory ?? "—"}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2 text-slate-500">
                        <div className="text-xs">
                          {book ? `₹${book.salePrice}` : "—"}
                        </div>
                      </td>

                      {/* Qty Out */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-900/60 outline-none"
                          value={item.quantityOut}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantityOut",
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                        />
                      </td>

                      {/* Remove */}
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-[11px] text-rose-500 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[2fr,1fr] items-start">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Trip Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs md:text-sm">
              <SummaryItem
                label="Total Books Out"
                value={summary.totalBooksOut}
              />
              <SummaryItem
                label="Expected Amount (approx.)"
                value={`₹${summary.expectedAmount}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm px-4 py-2.5 hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Trip"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 text-sm px-4 py-2.5 hover:bg-slate-50"
            >
              Reset Form
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
