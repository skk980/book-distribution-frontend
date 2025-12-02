import { useEffect, useMemo, useState } from "react";
import {
  Distributor,
  getDistributors,
  createDistributor,
  updateDistributor,
} from "../apis/client";

export default function DistributorsPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    notes: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () =>
    setForm({
      name: "",
      phone: "",
      notes: "",
      isActive: true,
    });

  const loadDistributors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDistributors();
      setDistributors(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load distributors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistributors();
  }, []);

  const startEdit = (d: Distributor) => {
    setEditingId(d._id);
    setForm({
      name: d.name,
      phone: d.phone || "",
      notes: d.notes || "",
      isActive: d.isActive,
    });
  };

  const handleFormChange = (
    field: keyof typeof form,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value } as typeof form));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      setError(null);

      if (editingId == null) {
        await createDistributor(payload);
      } else {
        await updateDistributor(editingId, payload);
      }

      await loadDistributors();
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save distributor");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return distributors.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.phone || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? d.isActive
          : !d.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [distributors, search, statusFilter]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, d) => {
        acc.totalTrips += d.totalTrips ?? 0;
        acc.totalBooksSold += d.totalBooksSold ?? 0;
        acc.totalAmountCollected += d.totalAmountCollected ?? 0;
        acc.count += 1;
        return acc;
      },
      {
        count: 0,
        totalTrips: 0,
        totalBooksSold: 0,
        totalAmountCollected: 0,
      }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Distributors</h1>
      </div>

      {/* Add / Edit Distributor form */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId == null ? "Add New Distributor" : "Edit Distributor"}
          </h2>
          {editingId != null && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                resetForm();
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Name *</label>
            <input
              type="text"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Enter distributor name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Phone</label>
            <input
              type="tel"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) =>
                handleFormChange("isActive", e.target.value === "active")
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Notes</label>
          <textarea
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none resize-none min-h-[70px]"
            value={form.notes}
            onChange={(e) => handleFormChange("notes", e.target.value)}
            placeholder="Any special info (services, area, schedule, etc.)"
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
              ? "Add Distributor"
              : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Filters + Summary */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search by name or phone..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/60 outline-none"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <SummaryChip label="Visible Distributors" value={summary.count} />
            <SummaryChip label="Total Trips" value={summary.totalTrips} />
            <SummaryChip label="Books Sold" value={summary.totalBooksSold} />
            <SummaryChip
              label="Amount Collected"
              value={`₹${summary.totalAmountCollected.toLocaleString()}`}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Trips</th>
                <th className="px-3 py-2">Books Sold</th>
                <th className="px-3 py-2">Amount Collected</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d._id}>
                  <td className="px-3 py-2 text-slate-800 font-medium">
                    {d.name}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{d.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge active={d.isActive} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {d.totalTrips ?? 0}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {d.totalBooksSold ?? 0}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    ₹{(d.totalAmountCollected ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-xs">
                    <span className="line-clamp-2">{d.notes || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      className="text-[11px] rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-xs text-slate-400"
                  >
                    No distributors found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="text-xs text-slate-500 mt-2">Loading distributors...</p>
        )}
      </section>
    </div>
  );
}

function SummaryChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium";
  if (active) {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>Active</span>
    );
  }
  return <span className={`${base} bg-slate-50 text-slate-500`}>Inactive</span>;
}
