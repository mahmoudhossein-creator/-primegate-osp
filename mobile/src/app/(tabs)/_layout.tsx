// ── _layout.tsx (tabs) ────────────────────────────────────────
import { Tabs } from "expo-router";
import { Home, ClipboardList, Receipt, CheckSquare } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle:           { backgroundColor:"#111827", borderTopColor:"#1F2937", borderTopWidth:0.5 },
      tabBarActiveTintColor:  "#F59E0B",
      tabBarInactiveTintColor:"#6B7280",
      tabBarLabelStyle:       { fontSize:10, fontWeight:"600" },
      headerStyle:            { backgroundColor:"#111827" },
      headerTitleStyle:       { color:"#F9FAFB", fontSize:15, fontWeight:"600" },
      headerTintColor:        "#F59E0B",
    }}>
      <Tabs.Screen name="home"     options={{ title:"Home",     tabBarIcon:({ color }) => <Home         size={20} color={color} /> }} />
      <Tabs.Screen name="tasks"    options={{ title:"BOQ",      tabBarIcon:({ color }) => <ClipboardList size={20} color={color} /> }} />
      <Tabs.Screen name="approve"  options={{ title:"Approve",  tabBarIcon:({ color }) => <CheckSquare  size={20} color={color} /> }} />
      <Tabs.Screen name="expenses" options={{ title:"Expenses", tabBarIcon:({ color }) => <Receipt      size={20} color={color} /> }} />
    </Tabs>
  );
}
