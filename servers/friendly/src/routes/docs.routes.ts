import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

export default async function docsRoutes(fastify: FastifyInstance) {
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
        const endpoint = {
          method: method.toUpperCase(),
          path,
          summary: op.summary || '',
          description: op.description || '',
          parameters: op.parameters || [],
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