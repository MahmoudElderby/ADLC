export type TraceItem = { sequence: number; category: string; summary: string; occurredAt: string };
export function TraceTimeline({ events }: { events: TraceItem[] }) {
  return <ol aria-label="Ordered trace">{events.map((event) => <li key={event.sequence}><strong>#{event.sequence} {event.category}</strong><span>{event.summary}</span><time>{event.occurredAt}</time></li>)}</ol>;
}
