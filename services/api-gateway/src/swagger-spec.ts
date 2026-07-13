export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'VividCraft API Gateway',
    version: '1.0.0',
    description:
      'Unified API Gateway for the VividCraft Digital Art & Comic Marketplace microservices ecosystem.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development Gateway' }],
  tags: [
    { name: 'Auth', description: 'Authentication and authorization' },
    { name: 'Marketplace', description: 'Digital product catalog' },
    { name: 'Transactions', description: 'Payments and checkout' },
    { name: 'Images', description: 'Image processing and watermarking' },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['CREATOR', 'FAN', 'ADMIN'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'User registered' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'JWT access token' } },
      },
    },
    '/api/marketplace/products': {
      get: {
        tags: ['Marketplace'],
        summary: 'List all digital products',
        responses: { '200': { description: 'Product list' } },
      },
      post: {
        tags: ['Marketplace'],
        summary: 'Create a new product listing',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Product created' } },
      },
    },
    '/api/transactions/checkout': {
      post: {
        tags: ['Transactions'],
        summary: 'Process checkout for digital goods',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Order created' } },
      },
    },
    '/api/images/watermark': {
      post: {
        tags: ['Images'],
        summary: 'Apply VividCraft watermark to image',
        requestBody: {
          required: true,
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
        },
        responses: { '200': { description: 'Watermarked image path' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
