"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "@/lib/api";
import { CheckCircle, XCircle, Clock, Plus } from "lucide-react";

const CAT_STYLES: Record<string, string> = {
  Fuel:             "text-amber-400 bg-amber-400/10",
  Accommodation:    "text-blue-400 bg-blue-400/10",
  "Equipment Rental": "text-green-400 bg-green-400/10",
  Food:             "text-purple-400 bg-purple-400/10",
  Miscellaneous:    "text-gray-400 bg-gray-400/10",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle size={12} className="text-green-400" />,
  pending:  <Clock size={12} className="text-amber-400" />,
  rejected: <XCircle size={12} className="text-red-400" />,
};

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    team_id: "", work_order_id: "", expense_date: "",
    category: "Fuel", description: "", amount_sar: "",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.list().then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => expensesApi.summary().then(r => r.data),
  });

  const createExpense = useMutation({
    mutationFn: (data: any) => expensesApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setShowCreate(false); },
  });

  const approveExpense = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) =>
      expensesApi.approve(id, { approved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const pending  = expenses.filter((e: any) => e.status === "pending").length;
  const approved = expenses.filter((e: any) => e.status === "approved");
  const totalApproved = approved.reduce((s: number, e: any) => s + e.amount_sar, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-white">Sites Expenses</h1>
          <p className="text-xs text-gray-500 mt-0.5">All districts · {new Date().toLocaleDateString("en-SA",{month:"long",year:"numeric"})}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={12} /> New Expense
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Total Approved</div>
            <div className="text-2xl font-semibold text-white">{totalApproved.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-1">SAR this month</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Pending</div>
            <div className="text-2xl font-semibold text-white">{pending}</div>
            <div className="text-[10px] text-gray-500 mt-1">Awaiting review</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500" />
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Approved</div>
            <div className="text-2xl font-semibold text-white">{approved.length}</div>
            <div className="text-[10px] text-gray-500 mt-1">This month</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Records</div>
            <div className="text-2xl font-semibold text-white">{expenses.length}</div>
            <div className="text-[10px] text-gray-500 mt-1">Total submissions</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-sm font-medium text-white">Expense Records</span>
            <span className="text-xs text-gray-500">{expenses.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800">
                <tr>
                  {["Date","Team","WO","Category","Description","Amount (SAR)","Status",""].map(h => (
                    <th key={h} className="text-left text-gray-500 px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center text-gray-500 py-8">Loading…</td></tr>
                ) : expenses.map((e: any) => (
                  <tr key={e.id} className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{e.expense_date}</td>
                    <td className="px-4 py-3 text-gray-200 font-medium whitespace-nowrap">{e.submitted_by?.name ?? `Team #${e.team_id}`}</td>
                    <td className="px-4 py-3 text-blue-400 font-mono">#{e.work_order_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CAT_STYLES[e.category] ?? "text-gray-400 bg-gray-400/10"}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{e.amount_sar.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 capitalize text-xs">
                        {STATUS_ICON[e.status]}
                        <span className={e.status === "approved" ? "text-green-400" : e.status === "rejected" ? "text-red-400" : "text-amber-400"}>
                          {e.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.status === "pending" && (
                        <div className="flex gap-1">
                          <button onClick={() => approveExpense.mutate({ id: e.id, approved: true })}
                            className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors">
                            Approve
                          </button>
                          <button onClick={() => approveExpense.mutate({ id: e.id, approved: false })}
                            className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Submit Site Expense</h2>

            {[
              { label: "Team ID",       field: "team_id",       type: "number" },
              { label: "Work Order ID", field: "work_order_id", type: "number" },
              { label: "Date",          field: "expense_date",  type: "date" },
              { label: "Description",   field: "description",   type: "text" },
              { label: "Amount (SAR)",  field: "amount_sar",    type: "number" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {["Fuel","Accommodation","Equipment Rental","Food","Miscellaneous"].map(c =>
                  <option key={c}>{c}</option>
                )}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 text-gray-400 text-xs py-2.5 rounded-lg hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => createExpense.mutate({ ...form, team_id: Number(form.team_id), work_order_id: Number(form.work_order_id), amount_sar: Number(form.amount_sar) })}
                disabled={createExpense.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold py-2.5 rounded-lg transition-colors"
              >
                {createExpense.isPending ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
