import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export const bearerAuth = createMiddleware(async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization) {
    throw new HTTPException(401, { message: 'Authorization header is required' })
  }

  const token = authorization.replace(/^Bearer\s+/, '')

  if (!token) {
    throw new HTTPException(401, { message: 'Bearer token is required' })
  }

  if (token !== process.env.API_KEY) {
    throw new HTTPException(401, { message: 'Invalid token' })
  }

  await next()
})