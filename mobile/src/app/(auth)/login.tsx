import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/auth";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const login  = useAuthStore(s => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Error","Please fill all fields"); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Login Failed","Invalid email or password");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==="ios"?"padding":"height"}>
      <View style={s.card}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Text style={s.logoText}>PG</Text></View>
          <View>
            <Text style={s.logoName}>Prime Gate</Text>
            <Text style={s.logoSub}>OSP Field App</Text>
          </View>
        </View>

        {/* Inputs */}
        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" placeholder="you@primegate.com"
            placeholderTextColor="#4B5563" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="••••••••" placeholderTextColor="#4B5563" />
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:"#030712", justifyContent:"center", padding:24 },
  card:      { backgroundColor:"#111827", borderRadius:20, padding:24, borderWidth:0.5, borderColor:"#1F2937" },
  logoRow:   { flexDirection:"row", alignItems:"center", gap:12, marginBottom:32 },
  logoBadge: { width:40, height:40, backgroundColor:"#F59E0B", borderRadius:10, alignItems:"center", justifyContent:"center" },
  logoText:  { color:"#000", fontWeight:"700", fontSize:13 },
  logoName:  { color:"#F9FAFB", fontWeight:"600", fontSize:16 },
  logoSub:   { color:"#6B7280", fontSize:11, marginTop:2 },
  field:     { marginBottom:16 },
  label:     { color:"#9CA3AF", fontSize:11, marginBottom:6 },
  input:     { backgroundColor:"#1F2937", borderRadius:10, borderWidth:0.5, borderColor:"#374151",
               paddingHorizontal:14, paddingVertical:12, color:"#F9FAFB", fontSize:14 },
  btn:       { backgroundColor:"#F59E0B", borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:8 },
  btnDisabled:{ opacity:0.6 },
  btnText:   { color:"#000", fontWeight:"700", fontSize:14 },
});
