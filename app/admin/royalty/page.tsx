"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  Eye,
  RefreshCw,
  Trash2,
  Calendar,
  BarChart3,
  ShoppingBag,
  BadgePercent,
  Megaphone,
  AlertCircle,
  Loader2,
  CalendarDays,
  CalendarRange,
  Building2,
  Target,
  Info,
  Pencil,
  Plus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoyaltyRecord {
  _id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  periodType: "monthly" | "custom";
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  subtotal?: number;
  discount?: number;
  netTotal?: number;
  tax?: number;
  includeTax?: boolean;
  totalOrders: number;
  royaltyRate: number;
  royaltyAmount: number;
  advertisementType: "percentage" | "fixed";
  advertisementRate: number;
  advertisementAmount: number;
  totalDue: number;
  status: "paid" | "unpaid";
  paidAt: string | null;
  paidNote: string;
  generatedAt: string;
}

interface Stats {
  totalSales: number;
  totalRoyaltyDue: number;
  totalAdsDue: number;
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  paidCount: number;
  unpaidCount: number;
  totalRecords: number;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface ItemBreakdown {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface DetailData {
  record: RoyaltyRecord;
  itemBreakdown: ItemBreakdown[];
  orderTypeBreakdown: { _id: string; count: number; revenue: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    n,
  );

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// Local date string formatter (YYYY-MM-DD) avoiding UTC shifts
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoyaltyPage() {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const getAuthConfig = () => {
    if (typeof window === "undefined") return { withCredentials: true };
    const token = localStorage.getItem("rms_superadmin_token");
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  };

  // ── State ──
  const [records, setRecords] = useState<RoyaltyRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [filterBranchId, setFilterBranchId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriodPreset, setFilterPeriodPreset] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Month options generator for filter dropdown
  const filterMonthOptions = useMemo(() => {
    const opts: { val: string; label: string; start: string; end: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const val = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const start = toLocalDateStr(firstDay);
      const end = toLocalDateStr(lastDay);
      opts.push({ val, label, start, end });
    }
    return opts;
  }, []);

  const handlePeriodPresetChange = (preset: string) => {
    setFilterPeriodPreset(preset);
    if (preset === "all") {
      setFilterStartDate("");
      setFilterEndDate("");
    } else if (preset === "this_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStartDate(toLocalDateStr(firstDay));
      setFilterEndDate(toLocalDateStr(lastDay));
    } else if (preset === "last_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setFilterStartDate(toLocalDateStr(firstDay));
      setFilterEndDate(toLocalDateStr(lastDay));
    } else if (preset === "custom") {
      // Keep existing custom dates or let user pick
    } else {
      const match = filterMonthOptions.find((m) => m.val === preset);
      if (match) {
        setFilterStartDate(match.start);
        setFilterEndDate(match.end);
      }
    }
  };

  // Generate modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPeriodType, setGenPeriodType] = useState<"monthly" | "custom">(
    "monthly",
  );
  const [genMonth, setGenMonth] = useState(new Date().getMonth());
  const [genYear, setGenYear] = useState(currentYear);
  const [genCustomStart, setGenCustomStart] = useState("");
  const [genCustomEnd, setGenCustomEnd] = useState("");
  const [genBranchMode, setGenBranchMode] = useState<"all" | "specific">("all");
  const [genSelectedBranches, setGenSelectedBranches] = useState<string[]>([]);
  const [genIncludeTax, setGenIncludeTax] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Mark Paid modal
  const [paidModal, setPaidModal] = useState<{ record: RoyaltyRecord } | null>(
    null,
  );
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paidNote, setPaidNote] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  // Detail modal
  const [detailModal, setDetailModal] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch branches ──
  const fetchBranches = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_URL}/branches?minimal=true`,
        getAuthConfig(),
      );
      if (res.data.success) setBranches(res.data.data || []);
    } catch {}
  }, []);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterBranchId !== "all") params.branchId = filterBranchId;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await axios.get(`${API_URL}/royalty/stats`, {
        ...getAuthConfig(),
        params,
      });
      if (res.data.success) setStats(res.data.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [filterBranchId, filterStatus, filterStartDate, filterEndDate]);

  // ── Fetch records ──
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterBranchId !== "all") params.branchId = filterBranchId;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await axios.get(`${API_URL}/royalty`, {
        ...getAuthConfig(),
        params,
      });
      if (res.data.success) setRecords(res.data.data.records || []);
    } catch {
      toast.error("Failed to fetch royalty records");
    } finally {
      setLoading(false);
    }
  }, [filterBranchId, filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [fetchStats, fetchRecords]);

  // ── Generate ──
  const handleGenerate = async () => {
    let periodStart = "";
    let periodEnd = "";

    if (genPeriodType === "monthly") {
      const firstDay = new Date(genYear, genMonth, 1);
      const lastDay = new Date(genYear, genMonth + 1, 0);
      periodStart = firstDay.toISOString().slice(0, 10);
      periodEnd = lastDay.toISOString().slice(0, 10);
    } else {
      if (!genCustomStart || !genCustomEnd) {
        toast.error("Please select both start and end dates");
        return;
      }
      if (new Date(genCustomStart) > new Date(genCustomEnd)) {
        toast.error("Start date cannot be after end date");
        return;
      }
      periodStart = genCustomStart;
      periodEnd = genCustomEnd;
    }

    const branchIds =
      genBranchMode === "specific" && genSelectedBranches.length > 0
        ? genSelectedBranches
        : null;

    setGenerating(true);
    try {
      const res = await axios.post(
        `${API_URL}/royalty/generate`,
        {
          periodType: genPeriodType,
          periodStart,
          periodEnd,
          branchIds,
          includeTax: genIncludeTax,
        },
        getAuthConfig(),
      );
      if (res.data.success) {
        const { generated, skipped, errors } = res.data.data;
        toast.success(
          `Generated: ${generated.length} | Skipped: ${skipped.length}${
            errors.length > 0 ? ` | Errors: ${errors.length}` : ""
          }`,
        );
        setShowGenModal(false);
        fetchStats();
        fetchRecords();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate records");
    } finally {
      setGenerating(false);
    }
  };

  // ── Mark Paid ──
  const handleMarkPaid = async () => {
    if (!paidModal) return;
    setMarkingPaid(true);
    try {
      const res = await axios.patch(
        `${API_URL}/royalty/${paidModal.record._id}/status`,
        { status: "paid", paidAt: paidDate, paidNote },
        getAuthConfig(),
      );
      if (res.data.success) {
        toast.success("Marked as paid");
        setPaidModal(null);
        setPaidNote("");
        fetchStats();
        fetchRecords();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setMarkingPaid(false);
    }
  };

  // ── Mark Unpaid ──
  const handleMarkUnpaid = async (record: RoyaltyRecord) => {
    try {
      const res = await axios.patch(
        `${API_URL}/royalty/${record._id}/status`,
        { status: "unpaid" },
        getAuthConfig(),
      );
      if (res.data.success) {
        toast.success("Marked as unpaid");
        fetchStats();
        fetchRecords();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  // ── View Detail ──
  const handleViewDetail = async (record: RoyaltyRecord) => {
    setDetailLoading(true);
    setDetailModal({ record, itemBreakdown: [], orderTypeBreakdown: [] });
    try {
      const res = await axios.get(
        `${API_URL}/royalty/${record._id}/detail`,
        getAuthConfig(),
      );
      if (res.data.success) setDetailModal(res.data.data);
    } catch {
      toast.error("Failed to load detail");
      setDetailModal(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/royalty/${deleteId}`, getAuthConfig());
      toast.success("Record deleted");
      setDeleteId(null);
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-primary">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-lg font-800 text-neutral-900">
              Royalty & Advertisement
            </h1>
            <p className="text-xs text-neutral-500 font-500">
              Track, generate & manage royalty dues per branch location
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGenModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 rounded-xl transition-all shadow-md shadow-brand-primary/20 cursor-pointer"
        >
          <RefreshCw size={14} />
          Generate Records
        </button>
      </div>



      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Net Sales",
            value: fmt(stats?.totalSales || 0),
            icon: ShoppingBag,
            iconBg: "bg-blue-50 border-blue-100 text-blue-600",
            valColor: "text-neutral-900",
            sub: `${stats?.totalRecords || 0} total records`,
          },
          {
            label: "Total Dues (Royalty + Ads)",
            value: fmt(stats?.totalDue || 0),
            icon: BadgePercent,
            iconBg: "bg-orange-50 border-orange-100 text-brand-primary",
            valColor: "text-brand-primary",
            sub: `Royalty: ${fmt(stats?.totalRoyaltyDue || 0)} · Ads: ${fmt(stats?.totalAdsDue || 0)}`,
          },
          {
            label: "Collected (Paid)",
            value: fmt(stats?.totalCollected || 0),
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
            valColor: "text-emerald-600",
            sub: `${stats?.paidCount || 0} paid records`,
          },
          {
            label: "Pending (Unpaid)",
            value: fmt(stats?.totalPending || 0),
            icon: Clock,
            iconBg: "bg-amber-50 border-amber-100 text-amber-600",
            valColor: "text-amber-600",
            sub: `${stats?.unpaidCount || 0} unpaid records`,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon size={16} />
                </div>
                {statsLoading && (
                  <Loader2
                    size={12}
                    className="animate-spin text-neutral-300"
                  />
                )}
              </div>
              <p className={`text-xl font-800 leading-tight ${card.valColor}`}>
                {card.value}
              </p>
              <p className="text-[10px] font-600 text-neutral-500 mt-1">
                {card.label}
              </p>
              <p className="text-[9px] text-neutral-400 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Branch dropdown */}
          <div className="relative">
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-600 text-neutral-700 focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
          </div>

          {/* Status toggle */}
          <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
            {["all", "unpaid", "paid"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 text-[10px] font-700 transition-all cursor-pointer capitalize ${
                  filterStatus === s
                    ? s === "paid"
                      ? "bg-emerald-600 text-white"
                      : s === "unpaid"
                        ? "bg-amber-500 text-white"
                        : "bg-brand-primary text-white"
                    : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {s === "all" ? "All Status" : s}
              </button>
            ))}
          </div>

          {/* Month / Period filter dropdown */}
          <div className="relative">
            <select
              value={filterPeriodPreset}
              onChange={(e) => handlePeriodPresetChange(e.target.value)}
              className="pl-8 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-600 text-neutral-700 focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="all">All Months / Periods</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <optgroup label="Select Month">
                {filterMonthOptions.map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
              <option value="custom">Custom Date Range</option>
            </select>
            <Calendar
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setFilterPeriodPreset("custom");
              }}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
            />
            <span className="text-neutral-400 text-xs">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setFilterPeriodPreset("custom");
              }}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
            />
            {(filterStartDate || filterEndDate || filterPeriodPreset !== "all") && (
              <button
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterPeriodPreset("all");
                }}
                className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer p-1 rounded-lg hover:bg-neutral-100"
                title="Clear period filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Records Table ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-xs font-800 text-neutral-800">
            Records{" "}
            <span className="text-neutral-400 font-600 ml-1">
              ({records.length})
            </span>
          </span>
          <button
            onClick={() => {
              fetchStats();
              fetchRecords();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-primary hover:bg-orange-50 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
            <span className="text-xs font-700 text-neutral-500">
              Loading records...
            </span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-sm font-800 text-neutral-800">
                No Records Found
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                No royalty records match your filters. Click{" "}
                <strong>Generate Records</strong> to create records for a
                period.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left px-5 py-3 font-700 text-neutral-500">
                    Branch
                  </th>
                  <th className="text-left px-4 py-3 font-700 text-neutral-500">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 font-700 text-neutral-500">
                    Total Sales
                  </th>
                  <th className="text-right px-4 py-3 font-700 text-neutral-500">
                    Royalty
                  </th>
                  <th className="text-right px-4 py-3 font-700 text-neutral-500">
                    Ads
                  </th>
                  <th className="text-right px-4 py-3 font-700 text-neutral-500">
                    Total Due
                  </th>
                  <th className="text-center px-4 py-3 font-700 text-neutral-500">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-700 text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {records.map((rec) => (
                  <tr
                    key={rec._id}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Branch */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-orange-100 text-brand-primary text-[9px] font-800 rounded uppercase">
                          {rec.branchCode}
                        </span>
                        <span className="font-700 text-neutral-800 truncate max-w-[140px]">
                          {rec.branchName}
                        </span>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3.5">
                      <div className="font-600 text-neutral-700">
                        {rec.periodLabel}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {fmtDate(rec.startDate)} – {fmtDate(rec.endDate)}
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-700 text-neutral-800">
                        {fmt(rec.totalSales)}
                      </span>
                      <div className="text-[10px] text-neutral-400 font-500">
                        {rec.totalOrders} orders
                      </div>
                    </td>

                    {/* Royalty */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-700 text-brand-primary">
                        {fmt(rec.royaltyAmount)}
                      </span>
                      <div className="text-[10px] text-neutral-400">
                        {rec.royaltyRate}%
                      </div>
                    </td>

                    {/* Ads */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-700 text-brand-primary">
                        {fmt(rec.advertisementAmount)}
                      </span>
                      <div className="text-[10px] text-neutral-400">
                        {rec.advertisementType === "percentage"
                          ? `${rec.advertisementRate}%`
                          : `$${rec.advertisementRate} fixed`}
                      </div>
                    </td>

                    {/* Total Due */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-800 text-neutral-900 text-sm">
                        {fmt(rec.totalDue)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {rec.status === "paid" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-700">
                            <CheckCircle2 size={9} /> Paid
                          </span>
                          {rec.paidAt && (
                            <div className="text-[9px] text-neutral-400 mt-0.5">
                              {fmtDate(rec.paidAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-700">
                          <Clock size={9} /> Unpaid
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(rec)}
                          title="View detail"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-primary hover:bg-orange-50 transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>

                        {rec.status === "unpaid" ? (
                          <button
                            onClick={() => {
                              setPaidModal({ record: rec });
                              setPaidDate(toLocalDateStr(new Date()));
                              setPaidNote("");
                            }}
                            title="Add Payment"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-700 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
                          >
                            <Plus size={11} /> Add Payment
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPaidModal({ record: rec });
                              setPaidDate(
                                rec.paidAt ? rec.paidAt.slice(0, 10) : toLocalDateStr(new Date())
                              );
                              setPaidNote(rec.paidNote || "");
                            }}
                            title="Edit Payment"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-700 bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900 transition-all cursor-pointer shadow-xs"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteId(rec._id)}
                          title="Delete record"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          GENERATE RECORDS MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h2 className="text-sm font-800 text-neutral-900 flex items-center gap-2">
                <RefreshCw size={16} className="text-brand-primary" />
                Generate Royalty Records
              </h2>
              <button
                onClick={() => setShowGenModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Period Type */}
              <div>
                <label className="block text-[11px] font-700 text-neutral-700 mb-2">
                  Period Type
                </label>
                <div className="flex rounded-xl border border-neutral-200 overflow-hidden">
                  {(["monthly", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setGenPeriodType(t)}
                      className={`flex-1 py-2.5 text-xs font-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        genPeriodType === t
                          ? "bg-brand-primary text-white"
                          : "text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      {t === "monthly" ? (
                        <>
                          <CalendarDays size={14} /> Monthly
                        </>
                      ) : (
                        <>
                          <CalendarRange size={14} /> Custom Range
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Picker */}
              {genPeriodType === "monthly" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-700 text-neutral-600 mb-1">
                      Month
                    </label>
                    <select
                      value={genMonth}
                      onChange={(e) => setGenMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-700 text-neutral-600 mb-1">
                      Year
                    </label>
                    <select
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Custom Range */}
              {genPeriodType === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-700 text-neutral-600 mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={genCustomStart}
                      onChange={(e) => setGenCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-700 text-neutral-600 mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={genCustomEnd}
                      onChange={(e) => setGenCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              )}

              {/* Branch Mode */}
              <div>
                <label className="block text-[11px] font-700 text-neutral-700 mb-2">
                  Branches
                </label>
                <div className="flex rounded-xl border border-neutral-200 overflow-hidden">
                  {(["all", "specific"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setGenBranchMode(m)}
                      className={`flex-1 py-2.5 text-xs font-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        genBranchMode === m
                          ? "bg-brand-primary text-white"
                          : "text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      {m === "all" ? (
                        <>
                          <Building2 size={14} /> All Active Branches
                        </>
                      ) : (
                        <>
                          <Target size={14} /> Specific Branches
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {genBranchMode === "specific" && (
                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                    {branches.map((b) => (
                      <label
                        key={b._id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-50 cursor-pointer border border-neutral-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={genSelectedBranches.includes(b._id)}
                          onChange={(e) => {
                            setGenSelectedBranches(
                              e.target.checked
                                ? [...genSelectedBranches, b._id]
                                : genSelectedBranches.filter(
                                    (id) => id !== b._id,
                                  ),
                            );
                          }}
                          className="w-3.5 h-3.5 rounded text-brand-primary cursor-pointer"
                        />
                        <span className="text-xs font-600 text-neutral-700">
                          <span className="font-800 text-brand-primary">
                            {b.code}
                          </span>{" "}
                          — {b.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Include Tax Option */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-700 text-neutral-800 block">Include Tax in Sales Base</span>
                  {/* <span className="text-[10px] text-neutral-500 font-500 block mt-0.5">
                    {genIncludeTax
                      ? "Royalty calculated on Net Total + Tax"
                      : "Royalty calculated on Net Total (Subtotal - Discount)"}
                  </span> */}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genIncludeTax}
                    onChange={(e) => setGenIncludeTax(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>

              {/* Info note */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-500 flex items-start gap-2">
                <Info size={14} className="shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Smart Protection Note:</strong>{" "}
                  {genPeriodType === "custom"
                    ? "Custom date ranges covering multiple months are automatically broken down into monthly chunks. Months that are already generated or paid will be safely skipped."
                    : "Records or periods already generated for this month will be automatically skipped to prevent duplicate billing."}
                </span>
              </div>
            </div>

            <div className="px-6 pb-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-700 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 rounded-xl transition-all shadow-md shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} /> Generate Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MARK PAID MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {paidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h2 className="text-sm font-800 text-neutral-900 flex items-center gap-2">
                {paidModal.record.status === "paid" ? (
                  <>
                    <Pencil size={16} className="text-brand-primary" />
                    Edit Royalty Payment
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="text-emerald-600" />
                    Add Royalty Payment
                  </>
                )}
              </h2>
              <button
                onClick={() => setPaidModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Record summary */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-orange-100 text-brand-primary text-[9px] font-800 rounded uppercase">
                    {paidModal.record.branchCode}
                  </span>
                  <span className="font-700 text-neutral-800">
                    {paidModal.record.branchName}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {paidModal.record.periodLabel}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="text-xs text-neutral-500">Total Due</span>
                  <span className="font-800 text-neutral-900 text-sm">
                    {fmt(paidModal.record.totalDue)}
                  </span>
                </div>
              </div>

              {/* Date picker */}
              <div>
                <label className="block text-[11px] font-700 text-neutral-700 mb-1">
                  Payment Received Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-700 text-neutral-700 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash received at office, Check #104"
                  value={paidNote}
                  onChange={(e) => setPaidNote(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="px-6 pb-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
              <div>
                {paidModal.record.status === "paid" && (
                  <button
                    onClick={() => handleMarkUnpaid(paidModal.record)}
                    className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock size={13} /> Revert to Unpaid
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaidModal(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-700 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid || !paidDate}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {markingPaid ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />{" "}
                      {paidModal.record.status === "paid" ? "Save Changes" : "Confirm Payment"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          IN-DEPTH DETAIL MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 flex-shrink-0">
              <div>
                <h2 className="text-sm font-800 text-neutral-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-primary" />
                  {detailModal.record.branchName}
                </h2>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {detailModal.record.periodLabel} ·{" "}
                  {fmtDate(detailModal.record.startDate)} –{" "}
                  {fmtDate(detailModal.record.endDate)}
                </p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
                  <span className="text-xs text-neutral-400">
                    Loading detail...
                  </span>
                </div>
              ) : (
                <>
                  {/* Summary grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Total Orders",
                        value: String(detailModal.record.totalOrders),
                      },
                      {
                        label: "Total Sales",
                        value: fmt(detailModal.record.totalSales),
                      },
                      {
                        label: "Royalty Due",
                        value: fmt(detailModal.record.royaltyAmount),
                      },
                      {
                        label: "Ads Due",
                        value: fmt(detailModal.record.advertisementAmount),
                      },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center"
                      >
                        <p className="text-base font-800 text-neutral-800">
                          {c.value}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {c.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Total due + status */}
                  <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <div>
                      <p className="text-xs font-600 text-neutral-600">
                        Total Due (Royalty + Ads)
                      </p>
                      <p className="text-2xl font-800 text-brand-primary">
                        {fmt(detailModal.record.totalDue)}
                      </p>
                    </div>
                    <div className="text-right">
                      {detailModal.record.status === "paid" ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-700">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                          {detailModal.record.paidAt && (
                            <p className="text-[10px] text-neutral-400 mt-1">
                              {fmtDate(detailModal.record.paidAt)}
                            </p>
                          )}
                          {detailModal.record.paidNote && (
                            <p className="text-[10px] text-neutral-500 mt-0.5 italic">
                              "{detailModal.record.paidNote}"
                            </p>
                          )}
                        </>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-700">
                            <Clock size={12} /> Unpaid
                          </span>
                          <button
                            onClick={() => {
                              setDetailModal(null);
                              setPaidModal({ record: detailModal.record });
                              setPaidDate(
                                new Date().toISOString().slice(0, 10),
                              );
                              setPaidNote("");
                            }}
                            className="block mt-1.5 text-[10px] font-700 text-emerald-600 hover:underline cursor-pointer"
                          >
                            Mark as Paid →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order type breakdown */}
                  {detailModal.orderTypeBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-xs font-800 text-neutral-800 mb-3 flex items-center gap-2">
                        <ShoppingBag size={13} className="text-brand-primary" />
                        Order Type Breakdown
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {detailModal.orderTypeBreakdown.map((ot) => (
                          <div
                            key={ot._id}
                            className="bg-neutral-50 border border-neutral-100 rounded-xl p-3"
                          >
                            <p className="text-[10px] font-700 text-neutral-500 capitalize">
                              {ot._id}
                            </p>
                            <p className="text-sm font-800 text-neutral-800 mt-0.5">
                              {fmt(ot.revenue)}
                            </p>
                            <p className="text-[9px] text-neutral-400">
                              {ot.count} orders
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item-wise breakdown */}
                  <div>
                    <h3 className="text-xs font-800 text-neutral-800 mb-3 flex items-center gap-2">
                      <BarChart3 size={13} className="text-brand-primary" />
                      Item-wise Sales Breakdown
                    </h3>
                    {detailModal.itemBreakdown.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400">
                        No item sales data available for this period
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {detailModal.itemBreakdown.map((item, i) => {
                          const maxRevenue =
                            detailModal.itemBreakdown[0]?.totalRevenue || 1;
                          const pct = (item.totalRevenue / maxRevenue) * 100;
                          return (
                            <div
                              key={item.name}
                              className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100"
                            >
                              <span className="text-[10px] font-700 text-neutral-400 w-5 flex-shrink-0 text-right">
                                #{i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-700 text-neutral-800 truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-xs font-800 text-neutral-900 flex-shrink-0">
                                    {fmt(item.totalRevenue)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-1 bg-brand-primary rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-neutral-400 flex-shrink-0">
                                    ×{item.totalQuantity}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-800 text-neutral-900">
                  Delete Record?
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-700 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-700 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
