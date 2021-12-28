import Router from '@koa/router'

export const router = new Router()

router.get('/', (ctx) => {
  ctx.body = {
    origin: 'ControlThemAll',
    message: 'Backend Server is Online',
    requestBody: ctx.request.body, // NOTE: Accessing the josn object sent by client:
  }
})
router.get('/settings', (ctx) => {
  ctx.body = {
    test: true,
  }
})

export default router
