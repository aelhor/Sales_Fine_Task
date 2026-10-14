import { Router, type Router as ExpressRouter } from 'express';
import { validateQuery } from '../common/http/validation.middleware';
import { ProductController } from './product.controller';
import { productPaginationSchema } from './product.schema';

/**
 * Creates the router for product HTTP endpoints.
 * @param productController Controller that handles product requests.
 * @returns Configured Express router for product routes.
 */
export function createProductRouter(productController: ProductController): ExpressRouter {
  const router = Router();
  router.get('/', validateQuery(productPaginationSchema), productController.list);
  return router;
}
