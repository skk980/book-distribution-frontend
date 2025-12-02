import { useEffect, useState } from "react";
import { Book, getBooks, createBook, updateBook } from "../apis/client";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    productName: "",
    subcategory: "",
    salePrice: "",
    currentStock: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    });

  const startEdit = (book: Book) => {
    setEditingId(book._id);
    setForm({
      productName: book.productName,
      subcategory: book.subcategory || "",
      salePrice: String(book.salePrice ?? ""),
      currentStock:
        typeof book.currentStock === "number" ? String(book.currentStock) : "",
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

    const payload = {
      productName: form.productName.trim(),
      subcategory: form.subcategory.trim() || undefined,
      salePrice: salePriceNum,
      currentStock: stockNum,
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

  const filtered = books.filter((b) =>
    b.productName.toLowerCase().includes(search.toLowerCase())
  );

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
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((book) => (
              <tr key={book._id}>
                <td className="px-4 py-2 font-medium text-slate-800">
                  {book.productName}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {book.subcategory || "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">₹{book.salePrice}</td>
                <td className="px-4 py-2 text-slate-500">
                  {book.currentStock ?? 0}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="text-xs rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                    type="button"
                    onClick={() => startEdit(book)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  No books found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
