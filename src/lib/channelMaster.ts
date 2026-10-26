import type { DistributionChannel } from './distribution-inventory';

export const CHANNEL_MASTER_QUERY_KEY = ['distribution-channels'] as const;
export type ChannelRuleReference = { channel_id?: string | null; channel_name?: string | null };

// IDs are authoritative. Do not guess mappings from labels, legacy names or
// kinds; the approved migration supplies those links without changing rates.
export function channelRuleLabel(rule: ChannelRuleReference, channels: DistributionChannel[]): string {
  const channel = channels.find(item => item.id === rule.channel_id);
  if (channel) return `${channel.name}${channel.is_active ? '' : ' (archived)'}`;
  return `${rule.channel_name || 'Unknown channel'} (mapping pending)`;
}

export function selectableChannels(channels: DistributionChannel[], existingChannelId?: string | null): DistributionChannel[] {
  return channels.filter(channel => channel.is_active || channel.id === existingChannelId);
}

export function requireChannelSelection(channelId: string, channels: DistributionChannel[], existingChannelId?: string | null): string {
  const channel = channels.find(item => item.id === channelId);
  if (!channel) throw new Error('Select a channel from the channel directory. Existing unmapped rules must be reconciled before editing.');
  if (!channel.is_active && channel.id !== existingChannelId) throw new Error('Archived channels cannot be selected for a new rule.');
  return channel.id;
}
