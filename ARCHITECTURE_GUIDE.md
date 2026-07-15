# 🗺️ VividCraft Microservices Architecture & Automated Specifications

## 1. Core Services & Infrastructure Map
* **App Infrastructure:**
  * Docker Compose orchestrating all services, databases, and message brokers.
  * Local source code is mounted inside containers (`volumes`) paired with hot-reload engines to eliminate manual restarts.
* **Gateway & Registry:**
  * API Gateway: Reverse proxy routing frontend traffic to internal microservices with rate limiting.
  * Swagger OpenAPI specs auto-generated at `/api/docs` on the gateway level.
* **Polyglot Microservices Ecosystem:**
  * `auth-service` (NestJS + Prisma + PostgreSQL): Handles email/password login, JWT, and RBAC. Docker setup includes automated `prisma generate` on startup.
  * `marketplace-service` (NestJS + Mongoose + MongoDB): Manages digital art, comics, asset listings, and catalog search.
  * `image-processor` (Python Flask + Pillow): Lightweight sidecar service for automated watermarking and image optimization for art previews.
  * `transaction-service` (NestJS + Prisma + PostgreSQL): Processes payments and handles secure digital downloads via BullMQ.

## 2. Infrastructure & Caching Strategy
* **Redis Cache:** Used for digital art catalog caching to handle high-traffic spikes.
* **Redis BullMQ:** Mission-critical message queuing system for processing payment webhooks and asynchronous digital asset delivery (zipping files and generating secure download links).

## 3. Frontend Specifications (React JS Ecosystem)
* **Framework:** React.js (Vite) with TypeScript and Tailwind CSS.
* **State Management & Data Fetching:** 
  * Zustand: Global state for user sessions and active shopping cart.
  * React Query (@tanstack/react-query): Handles server-state caching, automatic re-fetching on window focus, and optimistic UI updates.
* **Form Handling:** Formik combined with Yup schema validation for clean form controls.