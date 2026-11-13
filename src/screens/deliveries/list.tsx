import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Choice, Notice, Panel, Perspective, styles } from '@/components/ui/product-ui';
import { StatusLabel } from '@/components/ui/status-label';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { statusText, statusTone, windowText } from '@/features/demo/display';
import { useTheme } from '@/hooks/use-theme';
import type { Delivery, JobSummary } from '@/features/deliveries';

export function DeliveryListScreen() {
  const { gateway, actor, refresh } = useDemo(); const c = useTheme(); const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'active' | 'completed'>('active'); const [error, setError] = useState('');
  const load = useCallback(async () => ({ deliveries: await gateway.listDeliveries(actor), jobs: actor.role === 'rider' ? await gateway.listAvailableJobs(actor) : [] }), [gateway, actor]);
  const { data, loading, error: loadError } = useResource(load);
  const deliveries = data?.deliveries.filter(item => filter === 'completed' ? ['delivered', 'cancelled'].includes(item.status) : !['delivered', 'cancelled'].includes(item.status)) ?? [];
  const jobs = filter === 'active' ? data?.jobs ?? [] : [];
  const rows: (Delivery | JobSummary)[] = [...deliveries, ...jobs.filter(job => !deliveries.some(item => item.id === job.id))];
  async function accept(id: string) {
    try { const delivery = await gateway.execute(actor, { type: 'accept_job', deliveryId: id }); refresh(); router.push(`/deliveries/${delivery.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not accept this delivery.'); }
  }
  return <FlatList data={rows} keyExtractor={item => item.id} style={{ backgroundColor: c.background }}
    contentContainerStyle={{ width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, paddingBottom: insets.bottom + Spacing.fortyEight, gap: Spacing.three }}
    ListHeaderComponent={<View style={{ gap: Spacing.four, paddingBottom: Spacing.three }}>
      <Perspective />
      <AppText variant="title">Every parcel has a plan.</AppText>
      <AppText color="textSecondary">{actor.role === 'rider' ? 'Your assigned deliveries and available work.' : 'Your deliveries, availability, and handoff details in one place.'}</AppText>
      {actor.role === 'sender' && <Action title="Book a parcel" onPress={() => router.push('/book')} testID="book-parcel" />}
      <Choice label="Show deliveries" value={filter} onChange={setFilter} testID="delivery-filter"
        options={[{ label: 'Active', value: 'active' }, { label: 'Completed or cancelled', value: 'completed' }]} />
      {(error || loadError) && <Notice text={error || loadError || ''} danger />}
      {loading && <Busy />}
    </View>}
    ListEmptyComponent={!loading ? <Panel><AppText variant="heading">No deliveries here yet</AppText><AppText color="textSecondary">{actor.role === 'receiver' ? 'An invitation will appear here when the recipient chooses you.' : 'Try another filter or start the seeded demo from Account.'}</AppText><Action title="Refresh deliveries" secondary onPress={refresh} /></Panel> : undefined}
    renderItem={({ item }) => <Panel>
      <View style={styles.row}><AppText variant="label" style={styles.grow}>{item.reference}</AppText><StatusLabel label={statusText(item.status)} tone={statusTone(item.status)} /></View>
      <AppText variant="heading">{item.description}</AppText><AppText color="textSecondary">{windowText(item.window)}</AppText>
      {'pickup' in item ? <><AppText color="textSecondary">{item.pickup.label} → {item.dropoff.label}</AppText><Action title="View delivery" secondary onPress={() => router.push(`/deliveries/${item.id}`)} testID={`view-${item.reference}`} /></>
        : <><AppText variant="supporting" color="textSecondary">Full location details become available after assignment.</AppText><Action title="Accept delivery" onPress={() => void accept(item.id)} testID={`accept-${item.reference}`} /></>}
    </Panel>} />;
}
