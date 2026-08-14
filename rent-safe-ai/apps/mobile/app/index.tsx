import { Link } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';
export default function Home() { return <SafeAreaView><View style={{ padding: 24, gap: 16 }}><Text style={{ fontSize: 24, fontWeight: '700' }}>RentSafe</Text><Link href="/report">Report suspicious behavior</Link><Link href="/payment">Test/Sandbox Payment</Link></View></SafeAreaView>; }
