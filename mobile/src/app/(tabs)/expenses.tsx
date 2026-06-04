// ── expenses.tsx ──────────────────────────────────────────────
import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { expensesApi } from "@/lib/api";

const CATEGORIES = ["Fuel","Accommodation","Equipment Rental","Food","Miscellaneous"];
const CAT_EMOJI: Record<string,string> = {
  Fuel:"⛽", Accommodation:"🏨", "Equipment Rental":"🚜", Food:"🍽️", Miscellaneous:"📦",
};

export default function ExpensesScreen() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    team_id:"", work_order_id:"", expense_date: format(new Date(),"yyyy-MM-dd"),
    category:"Fuel", description:"", amount_sar:"",
  });

  const create = useMutation({
    mutationFn: () => expensesApi.create({
      ...form,
      team_id: Number(form.team_id),
      work_order_id: Number(form.work_order_id),
      amount_sar: parseFloat(form.amount_sar),
    }),
    onSuccess: () => {
      Alert.alert("✅","Expense submitted for approval.");
      setForm(f => ({ ...f, description:"", amount_sar:"" }));
    },
    onError: (e:any) => Alert.alert("Error", e.response?.data?.detail ?? e.message),
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Submit Site Expense</Text>
      <Text style={s.sub}>Will be sent to DM for approval</Text>

      {[
        { label:"Team ID",      field:"team_id",      keyboard:"numeric" as const },
        { label:"Work Order ID",field:"work_order_id",keyboard:"numeric" as const },
        { label:"Date",         field:"expense_date", keyboard:"default" as const },
        { label:"Description",  field:"description",  keyboard:"default" as const },
        { label:"Amount (SAR)", field:"amount_sar",   keyboard:"decimal-pad" as const },
      ].map(({ label, field, keyboard }) => (
        <View key={field} style={s.field}>
          <Text style={s.label}>{label}</Text>
          <TextInput
            style={s.input}
            keyboardType={keyboard}
            value={(form as any)[field]}
            onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
            placeholder={label} placeholderTextColor="#4B5563"
          />
        </View>
      ))}

      <View style={s.field}>
        <Text style={s.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection:"row", gap:8 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat}
                style={[s.catChip, form.category === cat && s.catChipActive]}
                onPress={() => setForm(f => ({ ...f, category: cat }))}>
                <Text style={[s.catText, form.category === cat && s.catTextActive]}>
                  {CAT_EMOJI[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[s.submitBtn, create.isPending && s.btnDisabled]}
        onPress={() => create.mutate()}
        disabled={create.isPending || !form.team_id || !form.work_order_id || !form.amount_sar}>
        {create.isPending
          ? <ActivityIndicator color="#000" />
          : <Text style={s.submitText}>Submit Expense →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:       { flex:1, backgroundColor:"#030712" },
  content:      { padding:16, paddingBottom:40 },
  title:        { color:"#F9FAFB", fontSize:18, fontWeight:"700", marginBottom:4 },
  sub:          { color:"#6B7280", fontSize:12, marginBottom:24 },
  field:        { marginBottom:16 },
  label:        { color:"#9CA3AF", fontSize:11, marginBottom:6 },
  input:        { backgroundColor:"#111827", borderRadius:10, borderWidth:0.5, borderColor:"#1F2937",
                  paddingHorizontal:14, paddingVertical:12, color:"#F9FAFB", fontSize:14 },
  catChip:      { paddingHorizontal:12, paddingVertical:8, borderRadius:20, borderWidth:0.5,
                  borderColor:"#374151", backgroundColor:"#111827" },
  catChipActive:{ backgroundColor:"#F59E0B22", borderColor:"#F59E0B" },
  catText:      { color:"#9CA3AF", fontSize:12 },
  catTextActive:{ color:"#F59E0B", fontWeight:"600" },
  submitBtn:    { backgroundColor:"#F59E0B", borderRadius:14, paddingVertical:16, alignItems:"center", marginTop:8 },
  btnDisabled:  { opacity:0.4 },
  submitText:   { color:"#000", fontWeight:"700", fontSize:15 },
});
