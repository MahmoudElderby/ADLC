export const productAreas = [
  { id: "skills", label: "Skills", to: "/skills" },
  { id: "mcp", label: "MCP Servers", to: "/mcp" },
] as const;

export type ProductAreaId = (typeof productAreas)[number]["id"];
