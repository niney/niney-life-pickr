import { FastifyReply } from 'fastify';
import { SuccessResponse, ErrorResponse } from '../types/response.types';

/**
 * Response helper utilities for Fastify
 */
export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    reply: FastifyReply,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): FastifyReply {
    const response: SuccessResponse<T> = {
      result: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    return reply.code(statusCode).send(response);
  }

  /**
   * Send error response
   */
  static error(
    reply: FastifyReply,
    message: string,
    statusCode: number = 500
  ): FastifyReply {
    const response: ErrorResponse = {
      result: false,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    return reply.code(statusCode).send(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    reply: FastifyReply,
    message: string = 'Validation failed'
  ): FastifyReply {
    return this.error(reply, message, 400);
  }

  /**
   * Send unauthorized error response
   */
  static unauthorized(
    reply: FastifyReply,
    message: string = 'Unauthorized'
  ): FastifyReply {
    return this.error(reply, message, 401);
  }

  /**
   * Send forbidden error response
   */
  static forbidden(
    reply: FastifyReply,
    message: string = 'Forbidden'
  ): FastifyReply {
    return this.error(reply, message, 403);
  }

  /**
   * Send not found error response
   */
  static notFound(
    reply: FastifyReply,
    message: string = 'Resource not found'
  ): FastifyReply {
    return this.error(reply, message, 404);
  }

  /**
   * Send conflict error response (e.g., duplicate resource)
   */
  static conflict(
    reply: FastifyReply,
    message: string = 'Resource already exists'
  ): FastifyReply {
    return this.error(reply, message, 409);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    reply: FastifyReply,
    data: T,
    message: string = 'Resource created successfully'
  ): FastifyReply {
    return this.success(reply, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(reply: FastifyReply): FastifyReply {
    return reply.code(204).send();
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    reply: FastifyReply,
    items: T[],
    page: number,
    pageSize: number,
    total: number,
    message: string = 'Success'
  ): FastifyReply {
    const totalPages = Math.ceil(total / pageSize);

    const response = {
      result: true,
      message,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      },
      timestamp: new Date().toISOString()
    };

    return reply.code(200).send(response);
  }
}

// Export convenient functions
export const successResponse = ResponseHelper.success;
export const errorResponse = ResponseHelper.error;
export const validationErrorResponse = ResponseHelper.validationError;
export const unauthorizedResponse = ResponseHelper.unauthorized;
export const forbiddenResponse = ResponseHelper.forbidden;
export const notFoundResponse = ResponseHelper.notFound;
export const conflictResponse = ResponseHelper.conflict;
export const createdResponse = ResponseHelper.created;
export const noContentResponse = ResponseHelper.noContent;
export const paginatedResponse = ResponseHelper.paginated;