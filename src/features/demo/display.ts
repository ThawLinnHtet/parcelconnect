import type { Delivery } from '@/features/deliveries';
import type { StatusTone } from '@/components/ui/status-label';

export function statusText(status: Delivery['status']) { return status.replaceAll('_', ' ').replace(/^./, x => x.toUpperCase()); }
export function statusTone(status: Delivery['status']): StatusTone { return status === 'delivered' ? 'success' : status === 'cancelled' ? 'danger' : 'information'; }
export function dateTime(value: string) { return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
export function windowText(window: Delivery['window']) { return `${dateTime(window.start)} to ${dateTime(window.end)}`; }
export function tomorrowWindow() { const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(14, 0, 0, 0); return { start: start.toISOString(), end: new Date(start.getTime() + 2 * 3600_000).toISOString() }; }
export function localInput(iso: string) { const date = new Date(iso); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16).replace('T', ' '); }
export function parseLocal(value: string) { const date = new Date(value.replace(' ', 'T')); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
