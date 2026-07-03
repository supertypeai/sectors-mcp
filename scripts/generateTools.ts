#!/usr/bin/env node
/**
 * Generate MCP tool files from OpenAPI schema.json
 * 
 * Strategy:
 * - Use the OPERATION_ID_TO_TOOL_NAME mapping to produce tools with
 *   the EXACT same names as the existing manual tools.
 * - This means generated tools will replace (in name only) the manual tools,
 *   but the actual tool files we generate will be in src/tools/generated/.
 * - The registerTools.ts will be updated to use the generated tools
 *   instead of the manual ones.
 */

import * as fs from "fs";
import * as path from "path";
import { OPERATION_ID_TO_TOOL_NAME } from "./toolNameMapping.js";

interface OpenAPISchema {
  paths: Record<string, Record<string, EndpointSpec>>;
}

interface EndpointSpec {
  operationId: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  tags?: string[];
  responses?: Record<string, any>;
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema: {
    type: string;
    enum?: string[];
    format?: string;
    default?: any;
  };
  description?: string;
}

function toFunctionName(toolName: string): string {
  // Convert "fetch-brokers" to "fetchBrokers"
  // Convert "get-subsectors" to "getSubsectors"
  return toolName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(toolName: string): string {
  // Convert "fetch-brokers" to "FetchBrokers"
  const camel = toFunctionName(toolName);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function getZodType(param: Parameter): string {
  const { type, enum: enumValues } = param.schema;
  
  if (enumValues && enumValues.length > 0) {
    const values = enumValues.map((v) => `"${v}"`).join(", ");
    return `z.enum([${values}])`;
  }
  
  switch (type) {
    case "string":
      return "z.string()";
    case "integer":
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    default:
      return "z.string()";
  }
}

function buildUrlConstruction(path: string, params: Parameter[]): string {
  const pathParams = params.filter((p) => p.in === "path");
  const queryParams = params.filter((p) => p.in === "query");
  
  // Strip /v2/ prefix from path (baseUrl already includes it)
  let cleanPath = path;
  if (cleanPath.startsWith("/v2/")) {
    cleanPath = cleanPath.substring(3);
  } else if (cleanPath.startsWith("v2/")) {
    cleanPath = cleanPath.substring(2);
  }
  
  let urlPath = cleanPath;
  pathParams.forEach((p) => {
    urlPath = urlPath.replace(`{${p.name}}`, `\${params.${p.name}}`);
  });
  
  const lines: string[] = [];
  lines.push(`  const url = new URL(\`\${baseUrl}${urlPath}\`);`);
  
  if (queryParams.length > 0) {
    queryParams.forEach((p) => {
      const paramName = p.name;
      if (p.required) {
        lines.push(`  url.searchParams.append("${p.name}", String(params.${paramName}));`);
      } else {
        lines.push(`  if (params.${paramName} !== undefined) {`);
        lines.push(`    url.searchParams.append("${p.name}", String(params.${paramName}));`);
        lines.push(`  }`);
      }
    });
  }
  
  return lines.join("\n");
}

function generateToolFile(
  toolName: string,
  path: string,
  method: string,
  spec: EndpointSpec
): string {
  const functionName = toFunctionName(toolName);
  const registerFnName = `register${toPascalCase(toolName)}Tool`;
  const params = spec.parameters || [];
  const description = spec.description || spec.summary || "";
  
  // Build parameter interface (snake_case to match schema)
  const paramInterface: string[] = [];
  params.forEach((p) => {
    const paramName = p.name;
    const optional = p.required ? "" : "?";
    let tsType: string;
    if (p.schema.enum) {
      tsType = p.schema.enum.map((v: string) => `"${v}"`).join(" | ");
    } else if (p.schema.type === "integer" || p.schema.type === "number") {
      tsType = "number";
    } else if (p.schema.type === "boolean") {
      tsType = "boolean";
    } else {
      tsType = "string";
    }
    paramInterface.push(`  ${paramName}${optional}: ${tsType};`);
  });
  
  // Build Zod schema
  const zodSchema: string[] = [];
  params.forEach((p) => {
    const paramName = p.name;
    let zodType = getZodType(p);
    if (p.description) {
      const desc = p.description.replace(/"/g, '\\"').replace(/\n/g, " ");
      zodType += `\n        .describe("${desc}")`;
    }
    if (!p.required) {
      zodType += ".optional()";
    }
    zodSchema.push(`      ${paramName}: ${zodType},`);
  });
  
  const urlConstruction = buildUrlConstruction(path, params);
  
  const hasParams = params.length > 0;
  const paramsType = hasParams ? `{\n${paramInterface.join("\n")}\n}` : "{}";
  
  return `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function ${functionName}(
  baseUrl: string,
  apiKey: string | undefined,
  params: ${paramsType}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

${urlConstruction}

  const response = await fetch(url.toString(), {
    method: "${method.toUpperCase()}",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function ${registerFnName}(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "${toolName}",
    ${JSON.stringify(description)},
    {${zodSchema.length > 0 ? "\n" + zodSchema.join("\n") + "\n    " : ""}},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (${hasParams ? `params` : "_"}) => {
      const result = await ${functionName}(baseUrl, apiKey, ${hasParams ? "params" : "{}"});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
`;
}

async function main() {
  const schemaPath = path.join(process.cwd(), "schema.json");
  const outputDir = path.join(process.cwd(), "src", "tools", "generated");
  
  console.log("Reading schema.json...");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const schema: OpenAPISchema = JSON.parse(schemaContent);
  
  // Clean output directory
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    for (const file of files) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Found ${Object.keys(schema.paths).length} endpoints in schema`);
  console.log(`Mapping has ${Object.keys(OPERATION_ID_TO_TOOL_NAME).length} entries\n`);
  
  const generatedTools: any[] = [];
  const toolNameToFile = new Map<string, string>();  // tool name -> file name
  const toolNameToOpId = new Map<string, string>();  // tool name -> operationId (for registration)
  let unmapped = 0;
  
  for (const [pathStr, methods] of Object.entries(schema.paths)) {
    for (const [method, spec] of Object.entries(methods)) {
      if (!spec.operationId) continue;
      
      const toolName = OPERATION_ID_TO_TOOL_NAME[spec.operationId];
      if (!toolName) {
        console.log(`⚠️  No mapping for ${spec.operationId} (path: ${pathStr})`);
        unmapped++;
        continue;
      }
      
      // Check if this tool name is already generated (e.g., for _retrieve_2)
      // If so, the first one wins (it should have the parameter in the path)
      if (toolNameToFile.has(toolName)) {
        console.log(`⏭️  Skipping ${spec.operationId} (tool ${toolName} already generated from ${toolNameToOpId.get(toolName)})`);
        continue;
      }
      
      const fileName = `${toolName}.ts`;
      const filePath = path.join(outputDir, fileName);
      const content = generateToolFile(toolName, pathStr, method, spec);
      
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`✅ ${fileName} ← ${spec.operationId}`);
      
      toolNameToFile.set(toolName, fileName);
      toolNameToOpId.set(toolName, spec.operationId);
      generatedTools.push({
        toolName,
        fileName,
        operationId: spec.operationId,
        functionName: toFunctionName(toolName),
        registerFn: `register${toPascalCase(toolName)}Tool`,
      });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Unmapped endpoints: ${unmapped}`);
  console.log(`   - Generated tools: ${generatedTools.length}`);
  console.log(`   - Unique tool names: ${toolNameToFile.size}`);
  
  // Generate index.ts
  const indexContent = generatedTools
    .map(
      (tool) =>
        `export { ${tool.functionName}, ${tool.registerFn} } from "./${tool.fileName.replace(".ts", ".js")}";`
    )
    .join("\n");
  
  fs.writeFileSync(
    path.join(outputDir, "index.ts"),
    indexContent + "\n",
    "utf-8"
  );
  
  console.log(`\n✅ Generated ${generatedTools.length} tool files in src/tools/generated/`);
  console.log(`✅ Generated index.ts`);
  console.log(`\n📝 Next: Update registerTools.ts to use generated tools instead of manual ones`);
}

main().catch(console.error);
