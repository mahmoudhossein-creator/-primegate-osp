import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { plansApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

const STATUS_COLOR: Record<string, string> = {
  pending:"#F59E0B", approved:"#22C55E", rejected:"#EF4444",
};

export default function HomeScreen() {
  const qc   = useQueryClient();
  const user = useAuthStore(s => s.user);
  const today = format(new Date(), "yyyy-MM-dd");
  const [activePlanId, setActivePlanId] = useState<number|null>(null);

  const { data: plans=[], isLoading, refetch } = useQuery({
    queryKey: ["my-plans", today],
    queryFn:  () => plansApi.list({ plan_date: today }).then(r => r.data),
  });

  const checkIn = useMutation({
    mutationFn: async (planId: number) => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Location permission denied");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return plansApi.checkIn(planId, { lat: loc.coords.latitude, lng: loc.coords.longitude });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["my-plans"] }); Alert.alert("✅","Checked in successfully!"); },
    onError:   (e:any) => Alert.alert("Error", e.message),
  });

  const checkOut = useMutation({
    mutationFn: async (planId: number) => {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return plansApi.checkOut(planId, { lat: loc.coords.latitude, lng: loc.coords.longitude });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["my-plans"] }); Alert.alert("✅","Checked out successfully!"); },
  });

  const todayPlans = plans.filter((p:any) => p.plan_date === today);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#F59E0B" />}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>Good {new Date().getHours()<12?"Morning":"Afternoon"},</Text>
        <Text style={s.userName}>{user?.name ?? "Team Leader"}</Text>
        <Text style={s.dateText}>{format(new Date(),"EEEE, d MMMM yyyy")}</Text>
      </View>

      {/* Today's Plans */}
      <Text style={s.sectionTitle}>Today's Work Plans</Text>

      {isLoading ? (
        <ActivityIndicator color="#F59E0B" style={{ marginTop:32 }} />
      ) : todayPlans.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyText}>No plans assigned for today</Text>
          <Text style={s.emptySubText}>Your DM will assign your daily work</Text>
        </View>
      ) : todayPlans.map((plan:any) => (
        <View key={plan.id} style={s.planCard}>
          {/* Shift header */}
          <View style={s.planHeader}>
            <View style={[s.shiftBadge, { backgroundColor: plan.shift==="AM" ? "#F59E0B22":"#3B82F622" }]}>
              <Text style={[s.shiftText, { color: plan.shift==="AM" ? "#F59E0B":"#3B82F6" }]}>
                {plan.shift==="AM" ? "☀️ AM Shift" : "🌙 PM Shift"}
              </Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[plan.status]+"22" }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[plan.status] }]}>
                {plan.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={s.planWO}>WO #{plan.work_order_id}</Text>
          <Text style={s.planEntries}>{plan.entries?.length ?? 0} BOQ items</Text>

          {/* BOQ items */}
          {plan.entries?.map((e:any) => (
            <View key={e.id} style={s.boqRow}>
              <Text style={s.boqItem}>{e.boq_description}</Text>
              <View style={s.boqQtys}>
                <Text style={s.boqPlanned}>{e.qty_planned} {e.unit}</Text>
                {e.qty_actual != null && (
                  <Text style={s.boqActual}>→ {e.qty_actual}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Approval flow */}
          <View style={s.flowRow}>
            <View style={s.flowStep}>
              <View style={[s.flowDot, plan.tl_submitted_at ? s.flowDone : s.flowWait]} />
              <Text style={s.flowLabel}>Submitted</Text>
            </View>
            <View style={s.flowLine} />
            <View style={s.flowStep}>
              <View style={[s.flowDot, plan.sup_approved_at ? s.flowDone : plan.tl_submitted_at ? s.flowActive : s.flowWait]} />
              <Text style={s.flowLabel}>Supervisor</Text>
            </View>
            <View style={s.flowLine} />
            <View style={s.flowStep}>
              <View style={[s.flowDot, plan.dm_received_at ? s.flowDone : s.flowWait]} />
              <Text style={s.flowLabel}>DM</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={s.actions}>
            {!plan.check_in_at && (
              <TouchableOpacity style={s.btnGreen} onPress={() => checkIn.mutate(plan.id)}
                disabled={checkIn.isPending}>
                <Text style={s.btnText}>📍 Check In</Text>
              </TouchableOpacity>
            )}
            {plan.check_in_at && !plan.check_out_at && (
              <TouchableOpacity style={s.btnAmber} onPress={() => checkOut.mutate(plan.id)}
                disabled={checkOut.isPending}>
                <Text style={s.btnText}>🏁 Check Out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:        { flex:1, backgroundColor:"#030712" },
  content:       { padding:16, paddingBottom:32 },
  header:        { backgroundColor:"#111827", borderRadius:16, padding:20, marginBottom:20, borderWidth:0.5, borderColor:"#1F2937" },
  greeting:      { color:"#9CA3AF", fontSize:13 },
  userName:      { color:"#F9FAFB", fontSize:22, fontWeight:"700", marginTop:2 },
  dateText:      { color:"#6B7280", fontSize:11, marginTop:4 },
  sectionTitle:  { color:"#F9FAFB", fontSize:14, fontWeight:"600", marginBottom:12 },
  emptyCard:     { backgroundColor:"#111827", borderRadius:16, padding:32, alignItems:"center", borderWidth:0.5, borderColor:"#1F2937" },
  emptyIcon:     { fontSize:32, marginBottom:12 },
  emptyText:     { color:"#F9FAFB", fontSize:14, fontWeight:"500" },
  emptySubText:  { color:"#6B7280", fontSize:12, marginTop:4 },
  planCard:      { backgroundColor:"#111827", borderRadius:16, padding:16, marginBottom:14, borderWidth:0.5, borderColor:"#1F2937" },
  planHeader:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  shiftBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  shiftText:     { fontSize:11, fontWeight:"600" },
  statusBadge:   { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  statusText:    { fontSize:10, fontWeight:"700" },
  planWO:        { color:"#60A5FA", fontSize:13, fontFamily:"monospace", marginBottom:2 },
  planEntries:   { color:"#6B7280", fontSize:11, marginBottom:12 },
  boqRow:        { flexDirection:"row", justifyContent:"space-between", alignItems:"center",
                   paddingVertical:6, borderTopWidth:0.5, borderTopColor:"#1F2937" },
  boqItem:       { color:"#D1D5DB", fontSize:12, flex:1 },
  boqQtys:       { flexDirection:"row", alignItems:"center", gap:6 },
  boqPlanned:    { color:"#60A5FA", fontSize:12, fontWeight:"500" },
  boqActual:     { color:"#22C55E", fontSize:12, fontWeight:"600" },
  flowRow:       { flexDirection:"row", alignItems:"center", marginTop:14, marginBottom:14 },
  flowStep:      { alignItems:"center", gap:4 },
  flowDot:       { width:10, height:10, borderRadius:5 },
  flowDone:      { backgroundColor:"#22C55E" },
  flowActive:    { backgroundColor:"#F59E0B" },
  flowWait:      { backgroundColor:"#374151" },
  flowLine:      { flex:1, height:1, backgroundColor:"#1F2937" },
  flowLabel:     { color:"#6B7280", fontSize:9 },
  actions:       { flexDirection:"row", gap:8 },
  btnGreen:      { flex:1, backgroundColor:"#22C55E22", borderRadius:10, paddingVertical:11, alignItems:"center" },
  btnAmber:      { flex:1, backgroundColor:"#F59E0B22", borderRadius:10, paddingVertical:11, alignItems:"center" },
  btnText:       { color:"#F9FAFB", fontWeight:"600", fontSize:13 },
});
