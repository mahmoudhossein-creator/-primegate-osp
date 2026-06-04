"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi } from "@/lib/api";
import { Plus, MapPin, ChevronRight } from "lucide-react";

const MILESTONE_ORDER = ["Design","Permit","Implementation","PAT","Asbuilt"];
const MILESTONE_COLORS: Record<string, string> = {
  Design: "text-blue-400 bg-blue-400/10",
  Permit: "text-amber-400 bg-amber-400/10",
  Implementation: "text-green-400 bg-green-400/10",
  PAT: "text-purple-400 bg-purple-400/10",
  Asbuilt: "text-gray-400 bg-gray-400/10",
};

export default function WorkOrdersPage() {
  const qc = useQueryClient();
  const [filterMilestone, setFilterMilestone] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ wo_number:"", title:"", district_id:"", location_address:"", start_date:"", end_date:"" });

  const { data: wos = [], isLoading } = useQuery({
    queryKey: ["wos", filterMilestone],
    queryFn: () => workOrdersApi.list(filterMilestone ? { milestone: filterMilestone } : {}).then(r => r.data),
  });

  const createWO = useMutation({
    mutationFn: (d: any) => workOrdersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wos"] }); setShowCreate(false); },
  });

  const advanceMilestone = useMutation({
    mutationFn: ({ id, milestone }: { id: number; milestone: string }) => workOrdersApi.setMilestone(id, milestone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wos"] }),
  });

  const counts = MILESTONE_ORDER.reduce((acc, m) => {
    acc[m] = wos.filter((w: any) => w.milestone === m).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-white">Work Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">{wos.length} total across all districts</p>
        </div>
        <div className="flex gap-2">
          <select value={filterMilestone} onChange={e => setFilterMilestone(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
            <option value="">All Milestones</option>
            {MILESTONE_ORDER.map(m => <option key={m}>{m}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={12} /> New WO
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Milestone pipeline */}
        <div className="grid grid-cols-5 gap-2">
          {MILESTONE_ORDER.map((m, i) => (
            <div key={m} className="bg-gray-900 border border-gray-800 rounded-xl p-3 relative overflow-hidden cursor-pointer hover:border-gray-600 transition-colors"
              onClick={() => setFilterMilestone(filterMilestone === m ? "" : m)}>
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                m==="Design"?"bg-blue-500":m==="Permit"?"bg-amber-500":m==="Implementation"?"bg-green-500":m==="PAT"?"bg-purple-500":"bg-gray-500"
              }`} />
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">{m}</div>
              <div className="text-2xl font-semibold text-white mt-1">{counts[m]}</div>
              {i < MILESTONE_ORDER.length - 1 && (
                <ChevronRight size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700" />
              )}
            </div>
          ))}
        </div>

        {/* WOs list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-800">
              <tr>
                {["WO Number","Title","District","Milestone","Location","Start","End","Action"].map(h => (
                  <th key={h} className="text-left text-gray-500 px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Loading…</td></tr>
              ) : wos.map((wo: any) => {
                const mIdx = MILESTONE_ORDER.indexOf(wo.milestone);
                const nextM = MILESTONE_ORDER[mIdx + 1];
                return (
                  <tr key={wo.id} className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-400 font-medium">{wo.wo_number}</td>
                    <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{wo.title}</td>
                    <td className="px-4 py-3 text-gray-400">#{wo.district_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MILESTONE_COLORS[wo.milestone]}`}>
                        {wo.milestone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">
                      {wo.location_address ? <span className="flex items-center gap-1"><MapPin size={10}/>{wo.location_address}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{wo.start_date ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{wo.end_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      {nextM && (
                        <button onClick={() => advanceMilestone.mutate({ id: wo.id, milestone: nextM })}
                          className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                          → {nextM}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Create Work Order</h2>
            {[
              { label:"WO Number",    field:"wo_number",       type:"text" },
              { label:"Title",        field:"title",           type:"text" },
              { label:"District ID",  field:"district_id",     type:"number" },
              { label:"Location",     field:"location_address",type:"text" },
              { label:"Start Date",   field:"start_date",      type:"date" },
              { label:"End Date",     field:"end_date",        type:"date" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 text-gray-400 text-xs py-2.5 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={() => createWO.mutate({ ...form, district_id: Number(form.district_id) })}
                disabled={!form.wo_number || !form.title || !form.district_id || createWO.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold py-2.5 rounded-lg transition-colors">
                {createWO.isPending ? "Creating…" : "Create WO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
