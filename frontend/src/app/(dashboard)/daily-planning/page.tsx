"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyPlansApi, teamsApi, workOrdersApi, boqApi } from "@/lib/api";
import { format } from "date-fns";
import { CheckCircle, Clock, Sun, Moon, Plus } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending:  "text-amber-400 bg-amber-400/10",
  approved: "text-green-400 bg-green-400/10",
  rejected: "text-red-400 bg-red-400/10",
};

export default function DailyPlanningPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    team_id: "", work_order_id: "", shift: "AM", entries: [] as any[]
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["daily-plans", selectedDate],
    queryFn: () => dailyPlansApi.list({ plan_date: selectedDate }).then(r => r.data),
  });

  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: () => teamsApi.list().then(r => r.data) });
  const { data: wos = [] }   = useQuery({ queryKey: ["wos"], queryFn: () => workOrdersApi.list().then(r => r.data) });
  const { data: boqItems = [] } = useQuery({
    queryKey: ["boq", form.work_order_id],
    queryFn:  () => boqApi.list(Number(form.work_order_id)).then(r => r.data),
    enabled:  !!form.work_order_id,
  });

  const createPlan = useMutation({
    mutationFn: (data: any) => dailyPlansApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["daily-plans"] }); setShowCreate(false); },
  });

  const approvePlan = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) =>
      dailyPlansApi.supervisorApprove(id, { approved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-plans"] }),
  });

  const handleSubmitPlan = () => {
    const entries = boqItems.map((b: any) => ({ boq_item_id: b.id, qty_planned: b.qty_planned }));
    createPlan.mutate({
      team_id: Number(form.team_id),
      work_order_id: Number(form.work_order_id),
      plan_date: selectedDate,
      shift: form.shift,
      entries,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-white">Daily Planning</h1>
          <p className="text-xs text-gray-500 mt-0.5">DM creates AM/PM shift plans per team</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={12} /> New Plan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="text-center text-gray-500 text-sm mt-12">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-12">
            No plans for {selectedDate}. Click "New Plan" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: any) => (
              <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${plan.shift === "AM" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                      {plan.shift === "AM" ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {plan.shift} Shift — Team #{plan.team_id} · WO #{plan.work_order_id}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {plan.entries?.length ?? 0} BOQ items planned
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATUS_STYLES[plan.status]}`}>
                    {plan.status}
                  </span>
                </div>

                {/* Approval flow */}
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <span className={`flex items-center gap-1 ${plan.tl_submitted_at ? "text-green-400" : "text-gray-600"}`}>
                    <CheckCircle size={11} /> TL Submitted
                  </span>
                  <span className="text-gray-700">→</span>
                  <span className={`flex items-center gap-1 ${plan.sup_approved_at ? "text-green-400" : plan.tl_submitted_at ? "text-amber-400" : "text-gray-600"}`}>
                    <Clock size={11} /> Supervisor
                  </span>
                  <span className="text-gray-700">→</span>
                  <span className={`flex items-center gap-1 ${plan.dm_received_at ? "text-green-400" : "text-gray-600"}`}>
                    <CheckCircle size={11} /> DM Received
                  </span>
                </div>

                {/* BOQ entries */}
                {plan.entries?.length > 0 && (
                  <div className="mt-3 border border-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="text-left text-gray-500 px-3 py-2 font-medium">Activity</th>
                          <th className="text-left text-gray-500 px-3 py-2 font-medium">Unit</th>
                          <th className="text-right text-gray-500 px-3 py-2 font-medium">Planned</th>
                          <th className="text-right text-gray-500 px-3 py-2 font-medium">Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.entries.map((e: any) => (
                          <tr key={e.id} className="border-t border-gray-800">
                            <td className="px-3 py-2 text-gray-300">{e.boq_description}</td>
                            <td className="px-3 py-2 text-gray-500">{e.unit}</td>
                            <td className="px-3 py-2 text-right text-blue-400 font-medium">{e.qty_planned}</td>
                            <td className={`px-3 py-2 text-right font-medium ${e.qty_actual != null ? "text-green-400" : "text-gray-600"}`}>
                              {e.qty_actual ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Approve button for supervisor */}
                {plan.tl_submitted_at && !plan.sup_approved_at && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approvePlan.mutate({ id: plan.id, approved: true })}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs py-2 rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approvePlan.mutate({ id: plan.id, approved: false })}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-2 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Create Daily Plan</h2>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Team</label>
              <select
                value={form.team_id}
                onChange={(e) => setForm(f => ({ ...f, team_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select team…</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Work Order</label>
              <select
                value={form.work_order_id}
                onChange={(e) => setForm(f => ({ ...f, work_order_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select WO…</option>
                {wos.map((w: any) => <option key={w.id} value={w.id}>{w.wo_number} — {w.title}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Shift</label>
              <div className="flex gap-2">
                {["AM","PM"].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, shift: s }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.shift === s ? "bg-amber-500 text-black border-amber-500" : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}
                  >
                    {s === "AM" ? "☀️ AM Shift" : "🌙 PM Shift"}
                  </button>
                ))}
              </div>
            </div>

            {boqItems.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">BOQ items ({boqItems.length})</div>
                {boqItems.map((b: any) => (
                  <div key={b.id} className="flex justify-between text-xs py-1">
                    <span className="text-gray-300">{b.description}</span>
                    <span className="text-blue-400">{b.qty_planned} {b.unit}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 text-gray-400 text-xs py-2.5 rounded-lg hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmitPlan}
                disabled={!form.team_id || !form.work_order_id || createPlan.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold py-2.5 rounded-lg transition-colors"
              >
                {createPlan.isPending ? "Creating…" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
