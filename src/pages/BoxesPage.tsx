import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Book,
  getBooks,
  getBoxes,
  createBox,
  updateBox,
} from "../apis/client";

type BoxFormState = {
  boxName: string;
  notes: string;
};

type ItemFormState = {
  bookId: string;
  quantity: string;
};

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const [boxForm, setBoxForm] = useState<BoxFormState>({
    boxName: "",
    notes: "",
  });

  const [itemForm, setItemForm] = useState<ItemFormState>({
    bookId: "",
    quantity: "",
  });

  const [loading, setLoading] = useState(false);
  const [savingBox, setSavingBox] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load books + boxes
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [booksRes, boxesRes] = await Promise.all([getBooks(), getBoxes()]);
      setBooks(booksRes);
      setBoxes(boxesRes);
      if (!selectedBoxId && boxesRes.length > 0) {
        setSelectedBoxId(boxesRes[0]._id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load boxes or books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBox = useMemo(
    () => boxes.find((b) => b._id === selectedBoxId) ?? null,
    [boxes, selectedBoxId]
  );

  const itemsForSelectedBox = useMemo(
    () => selectedBox?.items ?? [],
    [selectedBox]
  );

  const totalsForSelected = useMemo(() => {
    return itemsForSelectedBox.reduce(
      (acc, item) => {
        acc.totalBooks += item.quantity;
        acc.distinctTitles += 1;
        return acc;
      },
      { totalBooks: 0, distinctTitles: 0 }
    );
  }, [itemsForSelectedBox]);

  const boxSummary = useMemo(() => {
    return boxes.map((box) => {
      const items = box.items || [];
      const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
      const titles = items.length;
      return { ...box, totalQty, titles };
    });
  }, [boxes]);

  const handleBoxFormChange = (field: keyof BoxFormState, value: string) => {
    setBoxForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemFormChange = (field: keyof ItemFormState, value: string) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateBox = async () => {
    if (!boxForm.boxName.trim()) {
      alert("Box name is required.");
      return;
    }

    try {
      setSavingBox(true);
      setError(null);
      const newBox = await createBox({
        boxName: boxForm.boxName.trim(),
        notes: boxForm.notes.trim() || undefined,
        items: [],
      });
      setBoxes((prev) => [...prev, newBox]);
      setSelectedBoxId(newBox._id);
      setBoxForm({ boxName: "", notes: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create box");
    } finally {
      setSavingBox(false);
    }
  };

  const handleAddBoxItem = async () => {
    if (!selectedBox) {
      alert("Select a box first.");
      return;
    }
    if (!itemForm.bookId || !itemForm.quantity) {
      alert("Select book and quantity.");
      return;
    }

    const qty = Number(itemForm.quantity);
    if (qty <= 0) {
      alert("Quantity should be greater than 0.");
      return;
    }

    try {
      setSavingItems(true);
      setError(null);

      // Merge with existing items
      const currentItems = selectedBox.items || [];
      const existingIndex = currentItems.findIndex((i) => {
        const id = typeof i.book === "string" ? i.book : (i.book as Book)._id;
        return id === itemForm.bookId;
      });

      let updatedItems = [...currentItems];

      if (existingIndex >= 0) {
        const existing = updatedItems[existingIndex];
        updatedItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + qty,
        };
      } else {
        updatedItems.push({
          book: itemForm.bookId,
          quantity: qty,
        });
      }

      // Convert items to simple { book: id, quantity }
      const payloadItems = updatedItems.map((i) => ({
        book: typeof i.book === "string" ? i.book : (i.book as Book)._id,
        quantity: i.quantity,
      }));

      const updatedBox = await updateBox(selectedBox._id, {
        items: payloadItems,
      });

      setBoxes((prev) =>
        prev.map((b) => (b._id === updatedBox._id ? updatedBox : b))
      );
      setItemForm({ bookId: "", quantity: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update box items");
    } finally {
      setSavingItems(false);
    }
  };

  const handleRemoveItem = async (bookId: string) => {
    if (!selectedBox) return;

    try {
      setSavingItems(true);
      setError(null);

      const currentItems = selectedBox.items || [];
      const updatedItems = currentItems.filter((i) => {
        const id = typeof i.book === "string" ? i.book : (i.book as Book)._id;
        return id !== bookId;
      });

      const payloadItems = updatedItems.map((i) => ({
        book: typeof i.book === "string" ? i.book : (i.book as Book)._id,
        quantity: i.quantity,
      }));

      const updatedBox = await updateBox(selectedBox._id, {
        items: payloadItems,
      });

      setBoxes((prev) =>
        prev.map((b) => (b._id === updatedBox._id ? updatedBox : b))
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to remove item");
    } finally {
      setSavingItems(false);
    }
  };

  const findBookName = (id: string) =>
    books.find((b) => b._id === id)?.productName ?? "Unknown";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Boxes</h1>

      {loading && (
        <p className="text-xs text-slate-500">Loading boxes & books...</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-block">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        {/* Left: list of boxes + create box */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">All Boxes</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {boxSummary.map((box) => (
                <button
                  key={box._id}
                  type="button"
                  onClick={() => setSelectedBoxId(box._id)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-left ${
                    selectedBoxId === box._id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{box.boxName}</div>
                    <div className="text-[11px] text-slate-500">
                      {box.titles} titles • {box.totalQty} books
                    </div>
                  </div>
                  {box.notes && selectedBoxId === box._id && (
                    <span className="text-[11px] text-slate-200 line-clamp-1">
                      {box.notes}
                    </span>
                  )}
                </button>
              ))}
              {boxSummary.length === 0 && !loading && (
                <p className="text-xs text-slate-400">
                  No boxes yet. Create your first box below.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Create New Box
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Box Name *
                </label>
                <input
                  type="text"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
                  value={boxForm.boxName}
                  onChange={(e) =>
                    handleBoxFormChange("boxName", e.target.value)
                  }
                  placeholder="e.g. Box C"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Notes
                </label>
                <input
                  type="text"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
                  value={boxForm.notes}
                  onChange={(e) => handleBoxFormChange("notes", e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateBox}
                  disabled={savingBox}
                  className="inline-flex items-center rounded-xl bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingBox ? "Saving..." : "Save Box"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right: selected box details */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Box Details
              </h2>
              {selectedBox && (
                <span className="text-xs text-slate-500">
                  {totalsForSelected.distinctTitles} titles •{" "}
                  {totalsForSelected.totalBooks} books
                </span>
              )}
            </div>

            {!selectedBox && (
              <p className="text-xs text-slate-400">
                Select a box from the left to see its contents.
              </p>
            )}

            {selectedBox && (
              <>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedBox.boxName}
                  </div>
                  {selectedBox.notes && (
                    <div className="text-xs text-slate-500">
                      {selectedBox.notes}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Add Book to this Box
                  </h3>
                  <div className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
                      value={itemForm.bookId}
                      onChange={(e) =>
                        handleItemFormChange("bookId", e.target.value)
                      }
                    >
                      <option value="">Select book</option>
                      {books.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.productName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
                      placeholder="Quantity"
                      value={itemForm.quantity}
                      onChange={(e) =>
                        handleItemFormChange("quantity", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddBoxItem}
                      disabled={savingItems}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-xs md:text-sm px-3 py-2 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingItems ? "Saving..." : "+ Add"}
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2">Book</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsForSelectedBox.map((item) => {
                        const bookId =
                          typeof item.book === "string"
                            ? item.book
                            : (item.book as Book)._id;
                        return (
                          <tr key={bookId}>
                            <td
                              className="px-3 py-2 text-slate-8
00"
                            >
                              {findBookName(bookId)}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(bookId)}
                                className="text-[11px] text-rose-500 hover:text-rose-600"
                                disabled={savingItems}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {itemsForSelectedBox.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-center text-xs text-slate-400"
                          >
                            No books in this box yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
