import type { SessionStatus } from "@adlc/contracts";

export function SessionProgress({ status }: { status: SessionStatus }) {
  return (
    <section aria-label="Session progress">
      <h2>Progress</h2>
      <ol>
        <li>Provisioning</li>
        <li>Running</li>
        {status === "canceled" ? <li>Canceled</li> : <li>Completed</li>}
      </ol>
    </section>
  );
}
