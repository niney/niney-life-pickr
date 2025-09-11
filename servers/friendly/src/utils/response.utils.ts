import { Response } from 'express';
import { SuccessResponse, ErrorResponse } from '../types/response.types';

/**
 * Response helper utilities
 */
export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: SuccessResponse<T> = {
      result: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500
  ): Response {
    const response: ErrorResponse = {
      result: false,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    message: string = 'Validation failed'
  ): Response {
    return this.error(res, message, 400);
  }

  /**
   * Send unauthorized error response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden error response
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): Response {
    return this.error(res, message, 403);
  }

  /**
   * Send not found error response
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404);
  }

  /**
   * Send conflict error response (e.g., duplicate resource)
   */
  static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, 409);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    items: T[],
    page: number,
    pageSize: number,
    total: number,
    message: string = 'Success'
  ): Response {
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

    return res.status(200).json(response);
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
