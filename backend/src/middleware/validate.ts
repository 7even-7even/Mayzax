import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<any>;

/**
 * Validation middleware factory. Validates req.body / req.query / req.params
 * against Zod schemas and replaces them with the parsed (typed, coerced) result.
 */
export const validate = (schemas: { body?: Schema; query?: Schema; params?: Schema }) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as any;
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as any;
    }
    next();
  };
