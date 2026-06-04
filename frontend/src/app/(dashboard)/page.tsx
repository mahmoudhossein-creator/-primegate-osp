"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, teamsApi } from "@/lib/api";
import { format } from "date-fns";
import { Users, CheckCircle, FileCheck, Clock, TrendingUp } from "lucide-react";

function KPICard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function TeamRow({ team, onClick, selected }: { team: any; onClick: () => void; selected: boolean }) {
  const statusColors: Record<string, string> = {
    onsite: "bg-green-500", transit: "bg-amber-500", office: "bg-gray-500"
  };
  const typeColors: Record<string, string> = {
    Civil: "text-amber-400 bg-amber-400/10", Fiber: "text-blue-400 bg-blue-400/10", Design: "text-green-400 bg-green-400/10"
  };
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-gray-800 cursor-pointer flex items-center gap-3 transition-colors ${
        selected ? "bg-gray-800 border-r-2 border-r-amber-500" : "hover:bg-gray-800/50"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium text-amber-400">
        {team.name?.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200 truncate">{team.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeColors[team.type]}`}>{team.type}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{team.area}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${statusColors[team.status]}`} />
        <span className="text-[10px] text-gray-500 capitalize">{team.status}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary } = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => reportsApi.dashboardSummary().then(r => r.data) });
  const { data: teams = [], isLoading } = useQuery({ queryKey: ["teams"], queryFn: () => teamsApi.list().then(r => r.data) });

  const today = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-white">Field Teams — Daily View</h1>
          <p className="text-xs text-gray-500 mt-0.5">{today}</p>
        </div>
        <button className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          + Daily Plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-5 gap-3">
          <KPICard label="Total Teams"       value={summary?.total_teams ?? "–"}        sub="Across KSA"          color="bg-amber-500" />
          <KPICard label="On Site"           value={summary?.teams_onsite ?? "–"}       sub="Checked in today"    color="bg-green-500" />
          <KPICard label="Active WOs"        value={summary?.total_wos ?? "–"}          sub="Total assigned"      color="bg-blue-500" />
          <KPICard label="Pending Supervisor" value={summary?.pending_supervisor ?? "–"} sub="Awaiting approval"   color="bg-purple-500" />
          <KPICard label="Reached DM"        value={summary?.reached_dm ?? "–"}         sub="Supervisor approved" color="bg-red-500" />
        </div>

        {/* Teams list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-sm font-medium text-white">Teams</span>
            <span className="text-xs text-gray-500">{teams.length} teams</span>
          </div>
          <div className="overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading teams…</div>
            ) : teams.map((team: any) => (
              <TeamRow key={team.id} team={team} selected={false} onClick={() => {}} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
