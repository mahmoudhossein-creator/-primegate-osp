"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, expensesApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const TYPE_COLORS = { Civil:"#F59E0B", Fiber:"#3B82F6", Design:"#22C55E" };
const DIST_COLORS = ["#E8A020","#3B82F6","#22C55E","#A855F7","#EF4444"];
const CAT_COLORS  = { Fuel:"#F59E0B", Accommodation:"#3B82F6", "Equipment Rental":"#22C55E", Food:"#A855F7", Miscellaneous:"#6B7280" };

export default function ReportsPage() {
  const { data: dist }    = useQuery({ queryKey:["teams-dist"],    queryFn: () => reportsApi.teamsDistribution().then(r=>r.data) });
  const { data: achieve } = useQuery({ queryKey:["achievements"],  queryFn: () => reportsApi.achievements().then(r=>r.data) });
  const { data: expSum }  = useQuery({ queryKey:["exp-summary"],   queryFn: () => expensesApi.summary().then(r=>r.data) });

  const byTypeData = dist ? Object.entries(dist.by_type).map(([name, value]) => ({ name, value })) : [];
  const byDistData = dist ? Object.entries(dist.by_district).map(([name, value]) => ({ name, value })) : [];
  const byCatData  = expSum ? Object.entries(expSum.by_category as Record<string,number>).map(([name, value]) => ({ name, value })) : [];
  const byDistExp  = expSum ? Object.entries(expSum.by_district as Record<string,number>).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex-shrink-0">
        <h1 className="text-sm font-semibold text-white">Reports & Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">KSA Operations Overview</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Financial achievement KPI */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Total Financial Achievement</div>
              <div className="text-4xl font-semibold text-white">
                {achieve?.total_achievement_sar?.toLocaleString() ?? "—"}
                <span className="text-lg text-gray-500 ml-2">SAR</span>
              </div>
            </div>
            <div className="text-amber-400 opacity-20 text-8xl font-bold">﷼</div>
          </div>
        </div>

        {/* Charts row 1 — Teams */}
        <div className="grid grid-cols-3 gap-4">
          {/* Donut — by type */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-1">Teams by Type</div>
            <div className="text-[10px] text-gray-500 mb-4">Distribution across KSA</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {byTypeData.map((entry) => (
                    <Cell key={entry.name} fill={(TYPE_COLORS as any)[entry.name] ?? "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:"#9ca3af" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar — by district */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-1">Teams by District</div>
            <div className="text-[10px] text-gray-500 mb-4">All types combined</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byDistData} barSize={20}>
                <XAxis dataKey="name" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                <Bar dataKey="value" name="Teams" radius={[3,3,0,0]}>
                  {byDistData.map((_, i) => <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grouped — type × district */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-1">Type × District</div>
            <div className="text-[10px] text-gray-500 mb-4">Civil · Fiber · Design per region</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dist?.by_district_and_type ? (() => {
                const grouped: Record<string, any> = {};
                dist.by_district_and_type.forEach(({ district, type, count }: any) => {
                  if (!grouped[district]) grouped[district] = { district };
                  grouped[district][type] = count;
                });
                return Object.values(grouped);
              })() : []} barSize={10}>
                <XAxis dataKey="district" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                <Bar dataKey="Civil"  fill={TYPE_COLORS.Civil}  radius={[2,2,0,0]} />
                <Bar dataKey="Fiber"  fill={TYPE_COLORS.Fiber}  radius={[2,2,0,0]} />
                <Bar dataKey="Design" fill={TYPE_COLORS.Design} radius={[2,2,0,0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10, color:"#9ca3af" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 — Expenses */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-1">Expenses by Category</div>
            <div className="text-[10px] text-gray-500 mb-4">Approved expenses · SAR</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byCatData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, fontSize:11 }}
                  formatter={(v: any) => [`${Number(v).toLocaleString()} SAR`]} />
                <Bar dataKey="value" name="SAR" radius={[0,3,3,0]}>
                  {byCatData.map((entry) => (
                    <Cell key={entry.name} fill={(CAT_COLORS as any)[entry.name] ?? "#6B7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-medium text-white mb-1">Expenses by District</div>
            <div className="text-[10px] text-gray-500 mb-4">Approved expenses · SAR</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDistExp} barSize={24}>
                <XAxis dataKey="name" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, fontSize:11 }}
                  formatter={(v: any) => [`${Number(v).toLocaleString()} SAR`]} />
                <Bar dataKey="value" name="SAR" radius={[3,3,0,0]}>
                  {byDistExp.map((_, i) => <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
