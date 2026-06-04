import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { plansApi } from "@/lib/api";

export default function TasksScreen() {
  const qc    = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [actuals, setActuals] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");

  const { data: plans=[], isLoading } = useQuery({
    queryKey: ["my-plans-tasks", today],
    queryFn:  () => plansApi.list({ plan_date: today }).then(r => r.data),
  });

  const submit = useMutation({
    mutationFn: () => {
      const entries = selectedPlan.entries.map((e: any) => ({
        boq_item_id: e.boq_item_id,
        qty_actual:  parseFloat(actuals[e.boq_item_id] ?? "0"),
        photo_urls:  [],
        tl_notes:    notes,
      }));
      return plansApi.submit(selectedPlan.id, { entries, tl_notes: notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:["my-plans-tasks"] });
      Alert.alert("✅ Submitted","Report sent to Supervisor for approval.");
      setSelectedPlan(null); setActuals({}); setNotes("");
    },
    onError: (e:any) => Alert.alert("Error", e.response?.data?.detail ?? e.message),
  });

  const canSubmit = selectedPlan && !selectedPlan.tl_submitted_at &&
    selectedPlan.entries?.every((e:any) => actuals[e.boq_item_id] !== undefined);

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator color="#F59E0B" size="large" /></View>
  );

  // Plan list view
  if (!selectedPlan) return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Submit BOQ Report</Text>
      <Text style={s.sub}>Select a shift plan to submit actuals</Text>

      {plans.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyText}>No plans today</Text>
        </View>
      ) : plans.map((p:any) => (
        <TouchableOpacity key={p.id} style={[s.card, p.tl_submitted_at && s.cardDone]}
          onPress={() => { setSelectedPlan(p); setActuals({}); }}
          disabled={!!p.tl_submitted_at}>
          <View style={s.cardTop}>
            <Text style={s.cardShift}>{p.shift==="AM" ? "☀️ AM" : "🌙 PM"} — WO #{p.work_order_id}</Text>
            {p.tl_submitted_at
              ? <Text style={s.submitted}>✓ Submitted</Text>
              : <Text style={s.pending}>Tap to submit</Text>}
          </View>
          <Text style={s.cardCount}>{p.entries?.length ?? 0} BOQ items</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Submission form
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.back} onPress={() => setSelectedPlan(null)}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.title}>{selectedPlan.shift} Shift — WO #{selectedPlan.work_order_id}</Text>
      <Text style={s.sub}>Enter actual quantities completed</Text>

      {selectedPlan.entries?.map((e:any) => (
        <View key={e.boq_item_id} style={s.entryCard}>
          <Text style={s.entryName}>{e.boq_description}</Text>
          <View style={s.entryRow}>
            <View style={s.entryLeft}>
              <Text style={s.entryLabel}>Planned</Text>
              <Text style={s.entryPlanned}>{e.qty_planned} {e.unit}</Text>
            </View>
            <View style={s.entryRight}>
              <Text style={s.entryLabel}>Actual</Text>
              <TextInput
                style={s.actualInput}
                keyboardType="decimal-pad"
                placeholder={`0 ${e.unit}`}
                placeholderTextColor="#4B5563"
                value={actuals[e.boq_item_id] ?? ""}
                onChangeText={v => setActuals(a => ({ ...a, [e.boq_item_id]: v }))}
              />
            </View>
          </View>
        </View>
      ))}

      <View style={s.notesWrap}>
        <Text style={s.notesLabel}>Notes (optional)</Text>
        <TextInput style={s.notesInput} multiline numberOfLines={3}
          placeholder="Any issues or observations…" placeholderTextColor="#4B5563"
          value={notes} onChangeText={setNotes} />
      </View>

      <TouchableOpacity
        style={[s.submitBtn, (!canSubmit || submit.isPending) && s.submitBtnDisabled]}
        onPress={() => submit.mutate()}
        disabled={!canSubmit || submit.isPending}>
        {submit.isPending
          ? <ActivityIndicator color="#000" />
          : <Text style={s.submitText}>Submit to Supervisor →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:          { flex:1, backgroundColor:"#030712" },
  content:         { padding:16, paddingBottom:40 },
  center:          { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#030712" },
  title:           { color:"#F9FAFB", fontSize:18, fontWeight:"700", marginBottom:4 },
  sub:             { color:"#6B7280", fontSize:12, marginBottom:20 },
  empty:           { alignItems:"center", paddingVertical:48 },
  emptyIcon:       { fontSize:36, marginBottom:12 },
  emptyText:       { color:"#6B7280", fontSize:14 },
  card:            { backgroundColor:"#111827", borderRadius:14, padding:16, marginBottom:12,
                     borderWidth:0.5, borderColor:"#1F2937" },
  cardDone:        { opacity:0.5 },
  cardTop:         { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  cardShift:       { color:"#F9FAFB", fontSize:13, fontWeight:"600" },
  submitted:       { color:"#22C55E", fontSize:11 },
  pending:         { color:"#F59E0B", fontSize:11 },
  cardCount:       { color:"#6B7280", fontSize:11 },
  back:            { marginBottom:16 },
  backText:        { color:"#F59E0B", fontSize:13 },
  entryCard:       { backgroundColor:"#111827", borderRadius:12, padding:14, marginBottom:10,
                     borderWidth:0.5, borderColor:"#1F2937" },
  entryName:       { color:"#D1D5DB", fontSize:13, fontWeight:"500", marginBottom:10 },
  entryRow:        { flexDirection:"row", gap:12 },
  entryLeft:       { flex:1 },
  entryRight:      { flex:1 },
  entryLabel:      { color:"#6B7280", fontSize:10, marginBottom:4 },
  entryPlanned:    { color:"#60A5FA", fontSize:14, fontWeight:"600" },
  actualInput:     { backgroundColor:"#1F2937", borderRadius:8, borderWidth:0.5, borderColor:"#374151",
                     paddingHorizontal:12, paddingVertical:8, color:"#22C55E", fontSize:14, fontWeight:"600" },
  notesWrap:       { marginTop:8, marginBottom:20 },
  notesLabel:      { color:"#9CA3AF", fontSize:11, marginBottom:6 },
  notesInput:      { backgroundColor:"#111827", borderRadius:12, borderWidth:0.5, borderColor:"#1F2937",
                     padding:14, color:"#F9FAFB", fontSize:13, minHeight:80, textAlignVertical:"top" },
  submitBtn:       { backgroundColor:"#F59E0B", borderRadius:14, paddingVertical:16, alignItems:"center" },
  submitBtnDisabled:{ opacity:0.4 },
  submitText:      { color:"#000", fontWeight:"700", fontSize:15 },
});
