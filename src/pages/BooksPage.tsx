import { useEffect, useState, useMemo } from "react";
import {
  Book,
  getBooks,
  createBook,
  updateBook,
  deleteBook,
} from "../apis/client";

type StockEntry = {
  _id?: string;
  date: string;
  quantity: number;
  note?: string;
};

const todayStr = new Date().toISOString().slice(0, 10);

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [form, setForm] = useState({
    productName: "",
    subcategory: "",
    salePrice: "",
    currentStock: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stock history form + state
  const [stockForm, setStockForm] = useState({
    date: todayStr,
    quantity: "",
    note: "",
  });
  const [savingStock, setSavingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBooks();
      setBooks(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const resetForm = () =>
    setForm({
      productName: "",
      subcategory: "",
      salePrice: "",
      currentStock: "",
      notes: "",
    });

  const startEdit = (book: Book) => {
    setEditingId(book._id);
    // setSelectedBookId(book._id); // also select book for stock history
    setForm({
      productName: book.productName,
      subcategory: (book as any).subcategory || "",
      salePrice: String((book as any).salePrice ?? ""),
      currentStock:
        typeof (book as any).currentStock === "number"
          ? String((book as any).currentStock)
          : "",
      notes: (book as any).notes || "",
    });
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.productName.trim()) {
      alert("Product Name is required.");
      return;
    }
    if (!form.salePrice) {
      alert("Sale Price is required.");
      return;
    }

    const salePriceNum = Number(form.salePrice);
    const stockNum = form.currentStock ? Number(form.currentStock) : undefined;

    const payload: any = {
      productName: form.productName.trim(),
      subcategory: form.subcategory.trim() || undefined,
      salePrice: salePriceNum,
      currentStock: stockNum,
      notes: form.notes.trim() || undefined, // 🔹 new comments/notes
    };

    try {
      setSaving(true);
      setError(null);
      if (editingId == null) {
        // create
        await createBook(payload);
      } else {
        // update
        await updateBook(editingId, payload);
      }
      await loadBooks();
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save book");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      books.filter((b) => {
        const name = (b.productName || "").toLowerCase();
        const term = search.toLowerCase();
        return name.includes(term);
      }),
    [books, search]
  );

  const selectedBook = useMemo(
    () => books.find((b) => b._id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const stockHistory: StockEntry[] = useMemo(() => {
    if (!selectedBook) return [];
    return ((selectedBook as any).stockHistory || []) as StockEntry[];
  }, [selectedBook]);

  const handleStockFormChange = (
    field: keyof typeof stockForm,
    value: string
  ) => {
    setStockForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddStockEntry = async () => {
    if (!selectedBook) {
      alert("Select a book first from the table.");
      return;
    }
    if (!stockForm.date) {
      alert("Date is required.");
      return;
    }
    if (!stockForm.quantity) {
      alert("Quantity is required.");
      return;
    }

    const qty = Number(stockForm.quantity);
    if (Number.isNaN(qty)) {
      alert("Quantity must be a valid number.");
      return;
    }

    // Use the REAL stockHistory from the selected book, not local state
    const existingHistory = selectedBook.stockHistory || [];

    const newEntry = {
      date: stockForm.date,
      quantity: qty,
      note: stockForm.note?.trim() || undefined,
    };

    const updatedHistory = [...existingHistory, newEntry];

    const updatedBookPayload = {
      ...selectedBook, // <-- SAFE: keeps all original fields
      currentStock: (selectedBook.currentStock ?? 0) + qty,
      stockHistory: updatedHistory,
    };

    try {
      setSavingStock(true);
      setStockError(null);

      // Update DB
      await updateBook(selectedBook._id, updatedBookPayload);

      // Refresh list
      const freshBooks = await loadBooks();

      // Update selectedBook to fresh latest record
      const refreshed = freshBooks.find((b) => b._id === selectedBook._id);
      if (refreshed) setSelectedBook(refreshed);

      // Reset form
      setStockForm({
        date: todayStr,
        quantity: "",
        note: "",
      });
    } catch (err: any) {
      setStockError(
        err?.response?.data?.message || "Failed to add stock entry"
      );
    } finally {
      setSavingStock(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;

    try {
      setSaving(true);
      setError(null);
      await deleteBook(id);
      await loadBooks();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete book");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Books</h1>
      </div>

      {/* Add / Edit form */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId == null ? "Add New Book" : "Edit Book"}
          </h2>
          {editingId != null && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => {
                setEditingId(null);
                setSelectedBookId(null);
                resetForm();
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Product Name *
            </label>
            <input
              type="text"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.productName}
              onChange={(e) => handleFormChange("productName", e.target.value)}
              placeholder="Enter book name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Subcategory
            </label>
            <input
              type="text"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.subcategory}
              onChange={(e) => handleFormChange("subcategory", e.target.value)}
              placeholder="e.g. Gita, Krishna..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Sale Price (₹) *
            </label>
            <input
              type="number"
              min={0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.salePrice}
              onChange={(e) => handleFormChange("salePrice", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Current Stock
            </label>
            <input
              type="number"
              min={0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.currentStock}
              onChange={(e) => handleFormChange("currentStock", e.target.value)}
            />
          </div>
        </div>

        {/* Comments / Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Comments / Notes
          </label>
          <textarea
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none resize-none min-h-[70px]"
            value={form.notes}
            onChange={(e) => handleFormChange("notes", e.target.value)}
            placeholder="Any remarks about this book (language, print, special usage, etc.)"
          />
        </div>

        <div className="flex justify-between items-center gap-3">
          {error && (
            <span className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto inline-flex items-center rounded-xl bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId == null
              ? "Add Book"
              : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search books..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading && (
          <span className="text-xs text-slate-500">Loading books...</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-2">Product Name</th>
              <th className="px-4 py-2">Subcategory</th>
              <th className="px-4 py-2">Sale Price</th>
              <th className="px-4 py-2">Current Stock</th>
              <th className="px-4 py-2">Comments</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((book) => {
              const isOpen = selectedBookId === book._id;
              const stockHistory = (book as any).stockHistory || [];

              return (
                <>
                  {/* MAIN ROW */}
                  <tr
                    key={book._id}
                    onClick={() => setSelectedBookId(isOpen ? null : book._id)}
                    className="cursor-pointer"
                  >
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {book.productName}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {(book as any).subcategory || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      ₹{book.salePrice}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {book.currentStock ?? 0}
                    </td>

                    <td className="px-4 py-2 text-slate-500 max-w-xs">
                      {(book as any).notes || "—"}
                    </td>

                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBookId(isOpen ? null : book._id)
                        }
                        className="text-xs rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                      >
                        {isOpen ? "Hide Log" : "Show Log"}
                      </button>

                      <button
                        className="text-xs rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(book);
                        }}
                      >
                        Edit Book
                      </button>
                      <button
                        className="text-xs rounded-lg border border-rose-300 text-rose-600 px-3 py-1 hover:bg-rose-50"
                        type="button"
                        onClick={() => handleDelete(book._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {/* NESTED ROW (only when open) */}
                  {isOpen && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={6} className="px-4 py-3">
                        {/* Add Stock Entry Form */}
                        <div className="mb-4 grid gap-3 sm:grid-cols-[120px_120px_1fr_auto] items-end">
                          <div>
                            <label className="text-[11px] text-slate-600">
                              Date
                            </label>
                            <input
                              type="date"
                              className="w-full border rounded-lg px-2 py-1 text-sm"
                              value={stockForm.date}
                              onChange={(e) =>
                                setStockForm({
                                  ...stockForm,
                                  date: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-600">
                              Quantity
                            </label>
                            <input
                              type="number"
                              className="w-full border rounded-lg px-2 py-1 text-sm"
                              value={stockForm.quantity}
                              onChange={(e) =>
                                setStockForm({
                                  ...stockForm,
                                  quantity: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-600">
                              Note
                            </label>
                            <input
                              type="text"
                              className="w-full border rounded-lg px-2 py-1 text-sm"
                              value={stockForm.note}
                              onChange={(e) =>
                                setStockForm({
                                  ...stockForm,
                                  note: e.target.value,
                                })
                              }
                            />
                          </div>

                          <button
                            onClick={() => handleAddStockEntry()}
                            className="bg-slate-900 text-white rounded-lg px-3 py-1 text-xs hover:bg-slate-800"
                          >
                            Add
                          </button>
                        </div>

                        {/* Stock History Table */}
                        <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
                          <table className="min-w-full text-xs">
                            <thead className="bg-slate-100">
                              <tr className="text-left text-[11px] text-slate-600 uppercase tracking-wide">
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2">Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {stockHistory.map((h, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">{h.date}</td>
                                  <td className="px-3 py-2">{h.quantity}</td>
                                  <td className="px-3 py-2">{h.note || "—"}</td>
                                </tr>
                              ))}

                              {stockHistory.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="text-center text-slate-400 py-3"
                                  >
                                    No entries yet
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
