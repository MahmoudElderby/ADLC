import type { Agent } from "@adlc/contracts";

type AgentReviewPanelProps = {
  agent: Agent;
  onPublish: () => void;
};

export function AgentReviewPanel({ agent, onPublish }: AgentReviewPanelProps) {
  return (
    <aside aria-label="Agent review">
      <h2>Review</h2>
      <p>Approval mode: {agent.approvalMode}</p>
      <p>Status: {agent.status}</p>
      {agent.errors.length > 0 && (
        <section aria-label="Blocking errors">
          <h3>Blocking errors</h3>
          <ul>
            {agent.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}
      {agent.warnings.length > 0 && (
        <section aria-label="Warnings">
          <h3>Warnings</h3>
          <ul>
            {agent.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" disabled={agent.errors.length > 0} onClick={onPublish}>
        Publish
      </button>
    </aside>
  );
}
