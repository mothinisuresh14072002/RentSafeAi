import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { apiClient } from '../src/lib/api-client';

const categories = ['PAYMENT_SCAM', 'IDENTITY_MISREPRESENTATION', 'FAKE_LISTING', 'HARASSMENT', 'PHISHING', 'OTHER'];
export default function ReportScreen() {
  const [category, setCategory] = useState('PAYMENT_SCAM');
  const [subjectId, setSubjectId] = useState('');
  const [narrative, setNarrative] = useState('');
  const [sending, setSending] = useState(false);
  async function submit() {
    if (!subjectId.trim() || narrative.trim().length < 20) { Alert.alert('More detail needed', 'Add the listing/user ID and at least 20 characters describing what happened.'); return; }
    setSending(true);
    try { const result = await apiClient('/fraud-reports', { method: 'POST', body: JSON.stringify({ subjectType: 'LISTING', subjectId: subjectId.trim(), category, narrative: narrative.trim() }) }); Alert.alert('Report submitted', `Reference ${result.id}. Your identity is kept private.`); setNarrative(''); }
    catch (e: any) { Alert.alert('Could not submit report', e.message); } finally { setSending(false); }
  }
  return <SafeAreaView><ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}><Text style={{ fontSize: 24, fontWeight: '700' }}>Report suspicious behavior</Text><Text>We share your identity only when our safety policy permits it. Never send money outside RentSafe.</Text><TextInput placeholder="Listing or user ID" value={subjectId} onChangeText={setSubjectId} style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} /><Text style={{ fontWeight: '600' }}>What happened?</Text><View style={{ gap: 8 }}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={{ padding: 12, borderWidth: 1, borderColor: category === item ? '#2563eb' : '#ddd', borderRadius: 8 }}><Text>{item.replaceAll('_', ' ')}</Text></Pressable>)}</View><TextInput multiline numberOfLines={6} textAlignVertical="top" placeholder="Describe the behavior, request, or message (20–5000 characters)" value={narrative} onChangeText={setNarrative} style={{ borderWidth: 1, padding: 12, borderRadius: 8, minHeight: 130 }} /><Pressable disabled={sending} onPress={submit} style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 8 }}><Text style={{ color: 'white', textAlign: 'center' }}>{sending ? 'Submitting…' : 'Submit confidential report'}</Text></Pressable></ScrollView></SafeAreaView>;
}
