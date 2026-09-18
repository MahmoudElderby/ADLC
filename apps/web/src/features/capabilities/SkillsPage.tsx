import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  Badge,
  EmptyWorkspace,
  EntityColumnHeader,
  EntityRowBody,
  I,
  StatusBadge,
  SvgIcon,
  createActionClassName,
  entityRowClassName,
} from "@adlc/ui";
import { skillSchema } from "@adlc/contracts";
import { z } from "zod";
import { apiFetch } from "../../lib/api.js";

const skillsSchema = z.array(skillSchema);

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function skillDotStatus(status: string): string {
  if (status === "invalid") return "failed";
  if (status === "valid") return "healthy";
  if (status === "pending_validation") return "waiting";
  return "idle";
}

export function SkillsEntityColumn() {
  const location = useLocation();
  const skills = useQuery({
    queryKey: ["capabilities", "skills"],
    queryFn: () => apiFetch("/capabilities/skills", skillsSchema),
  });

  return (
    <div className="flex min-h-0 flex-col">
      <EntityColumnHeader
        title="Skills"
        createAction={
          <Link to="/skills/new" aria-label="Create skill" className={createActionClassName()}>
            <SvgIcon d={I.plus} size={14} />
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {skills.isPending ? <p className="px-3 py-3 text-[12px] text-[#4A5568]">Loading skills…</p> : null}
        {skills.data?.length ? (
          <ul className="m-0 list-none p-0">
            {skills.data.map((skill) => {
              const selected = location.pathname === `/skills/${skill.id}`;
              return (
                <li key={skill.id}>
                  <Link to={`/skills/${skill.id}`} className={entityRowClassName(selected)}>
                    <EntityRowBody
                      name={skill.name}
                      selected={selected}
                      status={skillDotStatus(skill.status)}
                      extra={
                        skill.status === "pending_validation" ? <Badge label="DRAFT" variant="amber" /> : null
                      }
                      meta={skill.version}
                    >
                      <span data-testid="skill-status">
                        <StatusBadge
                          status={{ validation: skill.status }}
                          label={statusLabel(skill.status)}
                        />
                      </span>
                    </EntityRowBody>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : skills.isSuccess ? (
          <p className="px-3 py-3 text-[12px] text-[#4A5568]">No skills registered yet.</p>
        ) : null}
      </div>
    </div>
  );
}

export function SkillsPage() {
  return (
    <EmptyWorkspace
      title="Skills"
      body="Select a skill from the entity column or create one to continue."
    />
  );
}
