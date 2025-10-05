import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import fs from 'fs';
import path from 'path';

// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper function to write documentation to file
function saveDocumentationToFile(routeName: string, content: string, format: 'markdown' | 'json' | 'txt'): string {
  const docsDir = path.join(process.cwd(), 'generated-docs', routeName);
  ensureDirectoryExists(docsDir);
  
  const extension = format === 'markdown' ? 'md' : format;
  const filename = `${routeName}-api-doc.${extension}`;
  const filepath = path.join(docsDir, filename);
  
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

export default async function docsRoutes(fastify: FastifyInstance) {
  /**
   * Generate documentation for specific route
   * GET /api/docs/generate/:routeName
   */
  fastify.get<{
    Params: { routeName: string }
  }>('/generate/:routeName', {
    schema: {
      tags: ['api'],
      summary: 'Generate documentation for a specific route',
      description: 'Generates and saves documentation for a specific route (auth, health, api, or crawler) in markdown, JSON, and text formats',
      params: Type.Object({
        routeName: Type.String({ description: 'Name of the route to generate docs for (auth, health, api, crawler)' })
      }),
      response: {
        200: Type.Object({
          routeName: Type.String(),
          files: Type.Object({
            markdown: Type.String(),
            json: Type.String()
          }),
          generatedAt: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { routeName } = request.params;
      const validRoutes = ['auth', 'health', 'api', 'crawler'];
      
      if (!validRoutes.includes(routeName)) {
        return reply.status(400).send({
          error: `Invalid route name. Must be one of: ${validRoutes.join(', ')}`
        });
      }

      // Get swagger specification
      const spec = fastify.swagger({ yaml: false });
      
      // Filter routes by prefix
      const filteredSpec = {
        ...spec,
        paths: Object.entries(spec.paths || {})
          .filter(([path]) => {
            if (routeName === 'health') return path.startsWith('/health');
            if (routeName === 'api') return path === '/api' || (path.startsWith('/api') && !path.startsWith('/api/auth') && !path.startsWith('/api/docs') && !path.startsWith('/api/crawler'));
            if (routeName === 'auth') return path.startsWith('/api/auth');
            if (routeName === 'crawler') return path.startsWith('/api/crawler');
            return false;
          })
          .reduce((acc, [path, methods]) => ({ ...acc, [path]: methods }), {})
      };

      // Generate markdown documentation
      const markdownDoc = generateMarkdownForRoute(filteredSpec, routeName);
      const markdownFile = saveDocumentationToFile(routeName, markdownDoc, 'markdown');

      // Generate JSON specification
      const jsonDoc = JSON.stringify(filteredSpec, null, 2);
      const jsonFile = saveDocumentationToFile(routeName, jsonDoc, 'json');

      // Generate AI-friendly prompt (txt format) - commented out as markdown is better for AI
      // const aiPrompt = generateAIPromptForRoute(filteredSpec, routeName);
      // const aiFile = saveDocumentationToFile(routeName, aiPrompt, 'txt');

      return {
        routeName,
        files: {
          markdown: markdownFile,
          json: jsonFile,
          // aiPrompt: aiFile
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      fastify.log.error('Error generating route documentation:', error);
      return reply.status(500).send({
        error: 'Failed to generate route documentation'
      });
    }
  });

  /**
   * Get OpenAPI specification in JSON format
   */
  fastify.get('/spec', {
    schema: {
      tags: ['api'],
      summary: 'Get OpenAPI specification',
      description: 'Get the complete OpenAPI 3.0 specification in JSON format',
      response: {
        200: Type.Object({}, { additionalProperties: true })
      }
    }
  }, async () => {
    return fastify.swagger();
  });

  /**
   * Get AI-friendly API prompt
   */
  fastify.get('/ai-prompt', {
    schema: {
      tags: ['api'],
      summary: 'Get AI prompt for API',
      description: 'Generate an AI-friendly prompt describing all available API endpoints',
      response: {
        200: Type.Object({
          prompt: Type.String(),
          endpoints: Type.Array(Type.Object({
            method: Type.String(),
            path: Type.String(),
            summary: Type.String(),
            description: Type.Optional(Type.String()),
            parameters: Type.Optional(Type.Array(Type.Object({
              name: Type.String(),
              in: Type.String(),
              required: Type.Boolean(),
              type: Type.String(),
              description: Type.Optional(Type.String())
            }))),
            requestBody: Type.Optional(Type.Object({
              required: Type.Boolean(),
              content: Type.Object({}, { additionalProperties: true })
            })),
            responses: Type.Object({}, { additionalProperties: true })
          }))
        })
      }
    }
  }, async () => {
    const spec = fastify.swagger();
    const endpoints = [];

    // Parse OpenAPI spec to extract endpoint information
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (method === 'parameters') continue;

        const op = operation as any;

        // Parse parameters to match the expected schema
        const parsedParameters = (op.parameters || []).map((param: any) => ({
          name: param.name || '',
          in: param.in || '',
          required: param.required || false,
          type: param.schema?.type || param.type || 'string',
          description: param.description || undefined
        }));

        const endpoint = {
          method: method.toUpperCase(),
          path,
          summary: op.summary || '',
          description: op.description || '',
          parameters: parsedParameters.length > 0 ? parsedParameters : undefined,
          requestBody: op.requestBody,
          responses: op.responses || {}
        };

        endpoints.push(endpoint);
      }
    }

    // Generate AI-friendly prompt
    const prompt = generateAIPrompt(spec, endpoints);

    return {
      prompt,
      endpoints
    };
  });

  /**
   * Get API documentation in Markdown format
   */
  fastify.get('/markdown', {
    schema: {
      tags: ['api'],
      summary: 'Get API documentation in Markdown',
      description: 'Generate comprehensive API documentation in Markdown format',
      response: {
        200: Type.Object({
          markdown: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async () => {
    const spec = fastify.swagger();
    const markdown = generateMarkdownDocs(spec);

    return {
      markdown,
      timestamp: new Date().toISOString()
    };
  });
}

/**
 * Generate markdown documentation for a specific route
 */
function generateMarkdownForRoute(spec: any, routeName: string): string {
  const title = routeName.charAt(0).toUpperCase() + routeName.slice(1);
  let markdown = `# ${title} API Documentation\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## Overview\n\n`;
  markdown += `This document describes the ${routeName} endpoints for the Niney Life Pickr API.\n\n`;
  
  if (spec.info) {
    markdown += `**Version**: ${spec.info.version || '1.0.0'}\n`;
    markdown += `**Base URL**: ${spec.servers?.[0]?.url || 'http://localhost:4000'}\n\n`;
  }

  markdown += '## Endpoints\n\n';
  
  // Generate endpoint documentation
  Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
    Object.entries(methods).forEach(([method, details]: [string, any]) => {
      markdown += `### ${method.toUpperCase()} ${path}\n\n`;
      if (details.summary) markdown += `**Summary**: ${details.summary}\n\n`;
      if (details.description) markdown += `**Description**: ${details.description}\n\n`;
      
      // Request body
      if (details.requestBody?.content?.['application/json']?.schema) {
        markdown += '**Request Body**:\n```json\n';
        markdown += generateExampleFromSchema(details.requestBody.content['application/json'].schema);
        markdown += '\n```\n\n';
      }
      
      // Responses
      if (details.responses) {
        markdown += '**Responses**:\n\n';
        Object.entries(details.responses).forEach(([code, response]: [string, any]) => {
          markdown += `- **${code}**: ${response.description || 'Response'}\n`;
          if (response.content?.['application/json']?.schema) {
            markdown += '  ```json\n  ';
            markdown += generateExampleFromSchema(response.content['application/json'].schema).replace(/\n/g, '\n  ');
            markdown += '\n  ```\n';
          }
        });
        markdown += '\n';
      }
    });
  });
  
  return markdown;
}

// /**
//  * Generate AI-friendly prompt for a specific route
//  */
// function generateAIPromptForRoute(spec: any, routeName: string): string {
//   const title = routeName.charAt(0).toUpperCase() + routeName.slice(1);
//   let prompt = `You are an AI assistant helping developers integrate with the ${title} API endpoints of Niney Life Pickr.\n\n`;
//   prompt += `API SPECIFICATION:\n\n`;
//   prompt += `Base URL: ${spec.servers?.[0]?.url || 'http://localhost:4000'}\n`;
//   prompt += `Version: ${spec.info?.version || '1.0.0'}\n\n`;
  
//   prompt += `AVAILABLE ENDPOINTS:\n\n`;
  
//   Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
//     Object.entries(methods).forEach(([method, details]: [string, any]) => {
//       prompt += `${method.toUpperCase()} ${path}\n`;
//       if (details.summary) prompt += `Purpose: ${details.summary}\n`;
//       if (details.description) prompt += `Details: ${details.description}\n`;
      
//       // Include request/response examples
//       if (details.requestBody?.content?.['application/json']?.schema) {
//         prompt += `Request Body Example:\n`;
//         prompt += generateExampleFromSchema(details.requestBody.content['application/json'].schema);
//         prompt += '\n';
//       }
      
//       if (details.responses?.['200']?.content?.['application/json']?.schema) {
//         prompt += `Success Response Example:\n`;
//         prompt += generateExampleFromSchema(details.responses['200'].content['application/json'].schema);
//         prompt += '\n';
//       }
      
//       prompt += '\n';
//     });
//   });
  
//   prompt += `\nWhen users ask about ${routeName} endpoints, provide accurate information based on this specification.`;
//   prompt += `\nAlways use the standardized response format with 'result', 'message', 'data', and 'timestamp' fields.`;
  
//   return prompt;
// }

/**
 * Generate AI-friendly prompt from OpenAPI spec
 */
function generateAIPrompt(spec: any, endpoints: any[]): string {
  const baseUrl = spec.servers?.[0]?.url || 'http://localhost:4000';
  
  let prompt = `# ${spec.info.title} API

## Overview
${spec.info.description}

Base URL: ${baseUrl}
Version: ${spec.info.version}

## Available Endpoints

You can interact with the following API endpoints:

`;

  // Group endpoints by tag
  const groupedEndpoints: { [key: string]: any[] } = {};
  
  for (const endpoint of endpoints) {
    const tag = spec.paths[endpoint.path]?.[endpoint.method.toLowerCase()]?.tags?.[0] || 'general';
    if (!groupedEndpoints[tag]) {
      groupedEndpoints[tag] = [];
    }
    groupedEndpoints[tag].push(endpoint);
  }

  // Generate prompt for each group
  for (const [tag, tagEndpoints] of Object.entries(groupedEndpoints)) {
    const tagInfo = spec.tags?.find((t: any) => t.name === tag);
    prompt += `\n### ${tag.charAt(0).toUpperCase() + tag.slice(1)}${tagInfo ? ` - ${tagInfo.description}` : ''}\n\n`;

    for (const endpoint of tagEndpoints) {
      prompt += `#### ${endpoint.method} ${endpoint.path}\n`;
      prompt += `**Purpose**: ${endpoint.summary}\n`;
      
      if (endpoint.description && endpoint.description !== endpoint.summary) {
        prompt += `**Description**: ${endpoint.description}\n`;
      }

      // Request body information
      if (endpoint.requestBody) {
        prompt += `\n**Request Body** (required: ${endpoint.requestBody.required}):\n`;
        const content = endpoint.requestBody.content?.['application/json'];
        if (content?.schema) {
          prompt += '```json\n';
          prompt += generateExampleFromSchema(content.schema);
          prompt += '\n```\n';
        }
      }

      // Parameters information
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        prompt += `\n**Parameters**:\n`;
        for (const param of endpoint.parameters) {
          prompt += `- ${param.name} (${param.in}, ${param.required ? 'required' : 'optional'}): ${param.description || 'No description'}\n`;
        }
      }

      // Response information
      if (endpoint.responses['200']) {
        const response = endpoint.responses['200'];
        prompt += `\n**Success Response** (200):\n`;
        const content = response.content?.['application/json'];
        if (content?.schema) {
          prompt += '```json\n';
          prompt += generateExampleFromSchema(content.schema);
          prompt += '\n```\n';
        }
      }

      prompt += '\n---\n\n';
    }
  }

  prompt += `
## Authentication
${spec.components?.securitySchemes?.bearerAuth ? 
  'This API uses JWT Bearer token authentication. Include the token in the Authorization header:\n`Authorization: Bearer <your-token>`' : 
  'This API does not require authentication for most endpoints.'}

## Error Responses
All endpoints follow a standard error response format:
\`\`\`json
{
  "result": false,
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## Usage Examples

### Registration Example
\`\`\`bash
curl -X POST ${baseUrl}/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","username":"newuser","password":"securepassword"}'
\`\`\`

### Login Example
\`\`\`bash
curl -X POST ${baseUrl}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"securepassword"}'
\`\`\`

## Rate Limiting
Currently, there are no rate limits implemented. Please use the API responsibly.

## Support
For API support, contact: ${spec.info.contact?.email || 'api@example.com'}
`;

  return prompt;
}

/**
 * Generate example JSON from TypeBox schema
 */
function generateExampleFromSchema(schema: any): string {
  if (!schema) return '{}';
  
  const example: any = {};
  
  if (schema.properties) {
    for (const [key, propValue] of Object.entries(schema.properties as any)) {
      const prop = propValue as any;
      if (prop.type === 'string') {
        if (prop.format === 'email') {
          example[key] = 'user@example.com';
        } else if (prop.format === 'date-time') {
          example[key] = new Date().toISOString();
        } else {
          example[key] = prop.description || 'string';
        }
      } else if (prop.type === 'number' || prop.type === 'integer') {
        example[key] = prop.example || 1;
      } else if (prop.type === 'boolean') {
        example[key] = true;
      } else if (prop.type === 'array') {
        example[key] = [];
      } else if (prop.type === 'object') {
        example[key] = generateExampleFromSchema(prop);
      }
    }
  }
  
  return JSON.stringify(example, null, 2);
}

/**
 * Generate Markdown documentation from OpenAPI spec
 */
function generateMarkdownDocs(spec: any): string {
  let markdown = `# ${spec.info.title}

${spec.info.description}

**Version**: ${spec.info.version}  
**License**: ${spec.info.license?.name || 'MIT'}  
**Contact**: ${spec.info.contact?.email || 'N/A'}

## Base URL

\`\`\`
${spec.servers?.[0]?.url || 'http://localhost:4000'}
\`\`\`

## Authentication

${spec.components?.securitySchemes?.bearerAuth ? 
  'This API uses **JWT Bearer Token** authentication.\n\nInclude the token in the Authorization header:\n```\nAuthorization: Bearer <your-token>\n```' : 
  'This API does not require authentication for most endpoints.'}

## Endpoints

`;

  // Generate table of contents
  const tags = spec.tags || [];
  if (tags.length > 0) {
    markdown += '### Table of Contents\n\n';
    for (const tag of tags) {
      markdown += `- [${tag.name}](#${tag.name.toLowerCase()}) - ${tag.description}\n`;
    }
    markdown += '\n---\n\n';
  }

  // Generate endpoint documentation
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operationValue] of Object.entries(methods as any)) {
      if (method === 'parameters') continue;
      
      const operation = operationValue as any;
      const tag = operation.tags?.[0] || 'general';
      markdown += `## ${method.toUpperCase()} ${path}\n\n`;
      markdown += `**Tag**: ${tag}\n\n`;
      markdown += `**Summary**: ${operation.summary || 'No summary'}\n\n`;
      
      if (operation.description) {
        markdown += `**Description**: ${operation.description}\n\n`;
      }

      // Parameters
      if (operation.parameters && operation.parameters.length > 0) {
        markdown += '### Parameters\n\n';
        markdown += '| Name | In | Type | Required | Description |\n';
        markdown += '|------|-----|------|----------|-------------|\n';
        for (const param of operation.parameters) {
          markdown += `| ${param.name} | ${param.in} | ${param.schema?.type || 'string'} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |\n`;
        }
        markdown += '\n';
      }

      // Request body
      if (operation.requestBody) {
        markdown += '### Request Body\n\n';
        markdown += `**Required**: ${operation.requestBody.required ? 'Yes' : 'No'}\n\n`;
        markdown += '**Content-Type**: application/json\n\n';
        
        const content = operation.requestBody.content?.['application/json'];
        if (content?.schema) {
          markdown += '**Schema**:\n```json\n';
          markdown += generateExampleFromSchema(content.schema);
          markdown += '\n```\n\n';
        }
      }

      // Responses
      markdown += '### Responses\n\n';
      for (const [code, response] of Object.entries(operation.responses || {})) {
        markdown += `#### ${code} ${(response as any).description || ''}\n\n`;
        const content = (response as any).content?.['application/json'];
        if (content?.schema) {
          markdown += '```json\n';
          markdown += generateExampleFromSchema(content.schema);
          markdown += '\n```\n\n';
        }
      }

      markdown += '---\n\n';
    }
  }

  return markdown;
}