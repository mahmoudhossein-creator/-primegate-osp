import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { plansApi } from "@/lib/api";

export default function ApproveScreen() {
  const qc    = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: plans=[], isLoading, refetch } = useQuery({
    queryKey: ["pending-approve", today],
    queryFn:  () => plansApi.list({ plan_date: today }).then(r =>
      r.data.filter((p:any) => p.tl_submitted_at && !p.sup_approved_at)
    ),
  });

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id:number; approved:boolean }) =>
      plansApi.supervisorApprove(id, { approved }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey:["pending-approve"] });
      Alert.alert(vars.approved ? "✅ Approved" : "❌ Rejected", "Report forwarded to DM automatically.");
    },
    onError: (e:any) => Alert.alert("Error", e.response?.data?.detail ?? e.message),
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#F59E0B" />}>
      <Text style={s.title}>Pending Approvals</Text>
      <Text style={s.sub}>TL reports awaiting supervisor review</Text>

      {isLoading ? (
        <ActivityIndicator color="#F59E0B" style={{ marginTop:40 }} />
      ) : plans.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>✅</Text>
          <Text style={s.emptyText}>All caught up!</Text>
          <Text style={s.emptySub}>No pending approvals for today</Text>
        </View>
      ) : plans.map((plan:any) => (
        <View key={plan.id} style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardShift}>{plan.shift === "AM" ? "☀️ AM" : "🌙 PM"} — WO #{plan.work_order_id}</Text>
            <Text style={s.cardTime}>
              Submitted {plan.tl_submitted_at ? format(new Date(plan.tl_submitted_at), "HH:mm") : ""}
            </Text>
          </View>

          {/* BOQ actuals */}
          <View style={s.boqWrap}>
            {plan.entries?.map((e:any) => (
              <View key={e.id} style={s.boqRow}>
                <Text style={s.boqName}>{e.boq_description}</Text>
                <View style={s.boqRight}>
                  <Text style={s.boqPlan}>{e.qty_planned} {e.unit}</Text>
                  <Text style={s.boqActual}>
                    {e.qty_actual != null
                      ? `→ ${e.qty_actual} ${e.unit}`
                      : "not submitted"}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {plan.tl_notes && (
            <View style={s.notesBox}>
              <Text style={s.notesLabel}>TL Notes</Text>
              <Text style={s.notesText}>{plan.tl_notes}</Text>
            </View>
          )}

          {/* Approve / Reject */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.rejectBtn}
              onPress={() => Alert.alert("Reject Report","Are you sure?", [
                { text:"Cancel", style:"cancel" },
                { text:"Reject", style:"destructive", onPress:() => approve.mutate({ id:plan.id, approved:false }) }
              ])} disabled={approve.isPending}>
              <Text style={s.rejectText}>✗ Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.approveBtn}
              onPress={() => approve.mutate({ id:plan.id, approved:true })}
              disabled={approve.isPending}>
              {approve.isPending
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={s.approveText}>✓ Approve → DM</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:      { flex:1, backgroundColor:"#030712" },
  content:     { padding:16, paddingBottom:40 },
  title:       { color:"#F9FAFB", fontSize:18, fontWeight:"700", marginBottom:4 },
  sub:         { color:"#6B7280", fontSize:12, marginBottom:20 },
  empty:       { alignItems:"center", paddingVertical:48 },
  emptyIcon:   { fontSize:40, marginBottom:12 },
  emptyText:   { color:"#F9FAFB", fontSize:16, fontWeight:"600" },
  emptySub:    { color:"#6B7280", fontSize:12, marginTop:4 },
  card:        { backgroundColor:"#111827", borderRadius:16, padding:16, marginBottom:14,
                 borderWidth:0.5, borderColor:"#1F2937" },
  cardHeader:  { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  cardShift:   { color:"#F9FAFB", fontSize:14, fontWeight:"600" },
  cardTime:    { color:"#6B7280", fontSize:11 },
  boqWrap:     { marginBottom:12 },
  boqRow:      { flexDirection:"row", justifyContent:"space-between", alignItems:"center",
                 paddingVertical:6, borderTopWidth:0.5, borderTopColor:"#1F2937" },
  boqName:     { color:"#D1D5DB", fontSize:12, flex:1 },
  boqRight:    { alignItems:"flex-end" },
  boqPlan:     { color:"#60A5FA", fontSize:11 },
  boqActual:   { color:"#22C55E", fontSize:12, fontWeight:"600" },
  notesBox:    { backgroundColor:"#1F2937", borderRadius:8, padding:10, marginBottom:12 },
  notesLabel:  { color:"#6B7280", fontSize:10, marginBottom:4 },
  notesText:   { color:"#D1D5DB", fontSize:12 },
  btnRow:      { flexDirection:"row", gap:10 },
  rejectBtn:   { flex:1, backgroundColor:"#EF444422", borderRadius:12, paddingVertical:13, alignItems:"center" },
  rejectText:  { color:"#EF4444", fontWeight:"700", fontSize:13 },
  approveBtn:  { flex:2, backgroundColor:"#22C55E", borderRadius:12, paddingVertical:13, alignItems:"center" },
  approveText: { color:"#000", fontWeight:"700", fontSize:13 },
});
