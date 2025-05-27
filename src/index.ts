import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/register-tools.js";

// Type definitions for MCP server events
type McpServerEvents = {
  error: (error: Error) => void;
  // Add other event types as needed
};

// Initialize MCP server
let server: McpServer;

// Store the original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Override console methods to prevent direct output when running under MCP inspector
if (process.env.MCP_INSPECTOR) {
  // In MCP inspector mode, we need to prevent any direct console output
  // as it will interfere with the JSON-RPC protocol
  console.log = (...args) => {
    if (!process.env.MCP_INSPECTOR) {
      originalConsole.log(...args);
    }
  };

  console.error = (...args) => {
    if (!process.env.MCP_INSPECTOR) {
      originalConsole.error(...args);
    }
  };

  console.warn = (...args) => {
    if (!process.env.MCP_INSPECTOR) {
      originalConsole.warn(...args);
    }
  };

  console.info = (...args) => {
    if (!process.env.MCP_INSPECTOR) {
      originalConsole.info(...args);
    }
  };

  console.debug = (...args) => {
    if (!process.env.MCP_INSPECTOR) {
      originalConsole.debug(...args);
    }
  };
}

try {
  // Create MCP server instance
  server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  });

  // Register all tools
  registerAllTools(server);

  // Set up and connect to stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    if (!process.env.MCP_INSPECTOR) {
      originalConsole.log(
        `Sectors MCP server (${SERVER_CONFIG.name} v${SERVER_CONFIG.version}) started successfully`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to initialize MCP server";
    console.error("Error:", errorMessage);
    process.exit(1);
  }

  // Handle process termination signals
  const shutdown = async (signal: string): Promise<never> => {
    if (!process.env.MCP_INSPECTOR) {
      console.log(`Received ${signal}. Shutting down gracefully...`);
    }
    try {
      // Clean up resources if needed
      process.exit(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during shutdown";
      console.error("Error during shutdown:", errorMessage);
      process.exit(1);
    }
  };

  // Set up signal handlers
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Handle unhandled promise rejections
  process.on(
    "unhandledRejection",
    (reason: unknown, promise: Promise<unknown>) => {
      const message = `Unhandled Rejection at: ${promise}, reason: ${reason}`;
      if (!process.env.MCP_INSPECTOR) {
        console.error(message);
      }
      // Consider whether to exit the process here based on your requirements
    }
  );

  // Handle uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    if (!process.env.MCP_INSPECTOR) {
      console.error("Uncaught Exception:", error);
    }
    // Consider whether to exit the process here based on your requirements
  });
} catch (error) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unknown error during server initialization";
  console.error("Failed to initialize MCP server:", errorMessage);
  process.exit(1);
}
