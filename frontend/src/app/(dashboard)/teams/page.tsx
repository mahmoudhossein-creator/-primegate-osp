"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamsApi } from "@/lib/api";
import { Plus, MapPin, Users, Wifi, WifiOff } from "lucide-react";

const TYPE_STYLES: Record<string, string> = {
  Civil:  "text-amber-400 bg-amber-400/10",
  Fiber:  "text-blue-400 bg-blue-400/10",
  Design: "text-green-400 bg-green-400/10",
};
const STATUS_DOT: Record<string, string> = {
  onsite: "bg-green-500", transit: "bg-amber-500", office: "bg-gray-500",
};

export default function TeamsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ district: "", type: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "Civil", district_id: "", area: "" });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams", filter],
    queryFn: () => teamsApi.list(filter).then(r => r.data),
  });

  const createTeam = useMutation({
    mutationFn: (d: any) => teamsApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["teams"] }); setShowCreate(false); },
  });

  const districts = [...new Set(teams.map((t: any) => t.district?.name).filter(Boolean))];

  const summary = {
    total:  teams.length,
    onsite: teams.filter((t: any) => t.status === "onsite").length,
    civil:  teams.filter((t: any) => t.type === "Civil").length,
    fiber:  teams.filter((t: any) => t.type === "Fiber").length,
    design: teams.filter((t: any) => t.type === "Design").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-white">Teams</h1>
          <p className="text-xs text-gray-500 mt-0.5">All field teams across KSA</p>
        </div>
        <div className="flex gap-2">
          <select value={filter.district} onChange={e => setFilter(f => ({ ...f, district: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
            <option value="">All Districts</option>
            {districts.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
            <option value="">All Types</option>
            <option>Civil</option><option>Fiber</option><option>Design</option>
          </select>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={12} /> New Team
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: summary.total, color: "bg-amber-500" },
            { label: "On Site", value: summary.onsite, color: "bg-green-500" },
            { label: "Civil", value: summary.civil, color: "bg-amber-400" },
            { label: "Fiber", value: summary.fiber, color: "bg-blue-500" },
            { label: "Design", value: summary.design, color: "bg-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</div>
              <div className="text-2xl font-semibold text-white mt-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Teams grid */}
        {isLoading ? (
          <div className="text-center text-gray-500 text-sm py-12">Loading teams…</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {teams.map((team: any) => (
              <div key={team.id}
                onClick={() => setSelected(selected?.id === team.id ? null : team)}
                className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all ${
                  selected?.id === team.id ? "border-amber-500" : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs font-medium">
                      {team.name?.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{team.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TYPE_STYLES[team.type]}`}>{team.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[team.status]}`} />
                    <span className="text-[10px] text-gray-500 capitalize">{team.status}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin size={11} /> {team.district?.name} — {team.area}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Users size={11} /> {team.members?.length ?? 0} members
                  </div>
                  {team.last_seen_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Wifi size={11} /> Last seen {new Date(team.last_seen_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Members list if selected */}
                {selected?.id === team.id && team.members?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Members</div>
                    {team.members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 py-1">
                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-gray-300">
                          {m.name?.[0]}
                        </div>
                        <span className="text-xs text-gray-300">{m.name}</span>
                        <span className="text-[10px] text-gray-600 capitalize ml-auto">{m.role?.replace("_"," ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Create New Team</h2>
            {[
              { label: "Team Name",    field: "name",        type: "text" },
              { label: "District ID",  field: "district_id", type: "number" },
              { label: "Area / Zone",  field: "area",        type: "text" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <div className="flex gap-2">
                {["Civil","Fiber","Design"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.type === t ? "bg-amber-500 text-black border-amber-500" : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 text-gray-400 text-xs py-2.5 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={() => createTeam.mutate({ ...form, district_id: Number(form.district_id) })}
                disabled={!form.name || !form.district_id || createTeam.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold py-2.5 rounded-lg transition-colors">
                {createTeam.isPending ? "Creating…" : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
