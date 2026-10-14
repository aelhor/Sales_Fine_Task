import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../common/dto/api-response.interface';
import type { ProductPaginationQuery } from './product.schema';
import { ProductService } from './product.service';

/**
 * Handles HTTP requests for product resources.
 */
export class ProductController {
  /**
   * Creates a product controller using the product service.
   * @param productService Service that retrieves products.
   */
  constructor(private readonly productService: ProductService) {}

  /**
   * Sends the available product list using the shared API envelope.
   * @param request Express request carrying the correlation ID.
   * @param response Express response used to send the product list.
   * @param next Express callback used to forward unexpected errors.
   * @returns Nothing after sending a response or forwarding an error.
   */
  readonly list = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pagination = request.validatedQuery as ProductPaginationQuery;
      const result = await this.productService.getProducts(pagination);
      response.setHeader('X-Cache', result.cacheStatus);
      sendSuccess(
        response,
        request.correlationId,
        'Products retrieved successfully',
        result.products,
        { meta: result.meta },
      );
    } catch (error: unknown) {
      next(error);
    }
  };
}
