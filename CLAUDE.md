# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**work-mate-server** is a Node.js/Express.js REST API server built with TypeScript that serves as the backend for a collaborative workspace application. The application helps developers and professionals find and share work locations with detailed collaboration profiles.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

### Testing & Quality
- No test framework currently configured
- No linting commands available
- TypeScript compilation serves as type checking

## Architecture Overview

### Core Structure
- **Models**: Direct MongoDB operations using native driver (no ORM)
- **Routes**: Express.js route handlers with Swagger documentation
- **Middleware**: JWT authentication, CORS, security headers
- **Database**: MongoDB with manual connection management

### Key Components
- **Authentication**: JWT tokens stored in HTTP-only cookies, 2-hour sliding window
- **WorkPlace Management**: CRUD operations for location-based workspaces
- **User Profiles**: Comprehensive developer profiles with GitHub/Google OAuth
- **Migration System**: Schema evolution support with rollback capabilities

### Database Models
- **Users**: Authentication (email/GitHub/Google), profiles, social links, collaboration goals
- **WorkPlaces**: Location coordinates, descriptions (array of timestamped entries), ownership

## API Structure

### Authentication Flow
- Multi-provider OAuth (GitHub, Google) and email-based auth
- JWT tokens with automatic refresh on API calls
- User profile management with collaboration preferences

### WorkPlace Operations
- `GET /workplace` - User's own workplaces (authenticated)
- `GET /workplace/all` - All workplaces with creator info (public)
- Full CRUD operations with proper authorization checks

## Development Patterns

### Database Operations
- Use MongoDB aggregation pipelines for complex queries (see `findAllWithCreators`)
- Proper ObjectId handling with type conversion utilities
- All timestamps managed automatically (createdAt, updatedAt)

### Error Handling
- Consistent error response format: `{ error: "message" }`
- HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Korean error messages for user-facing responses

### Security Considerations
- Never commit sensitive data (JWT_SECRET, MongoDB credentials)
- Use environment variables for all configuration
- Validate user ownership before modifying resources
- CORS configured for specific client origins

## Migration System

- Run migrations with `npm run migrate`
- Migration files in `src/migrations/` with naming convention `001_description.ts`
- Current migration: Converting WorkPlace description from string to array format
- Always include both up and down migration methods

## Environment Configuration

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend URL for CORS
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - Google OAuth

## Common Development Tasks

### Adding New Routes
1. Create route handler in appropriate file under `src/routes/`
2. Add comprehensive Swagger documentation
3. Include proper authentication middleware if needed
4. Follow existing error handling patterns

### Database Schema Changes
1. Create migration file in `src/migrations/`
2. Update TypeScript interfaces in model files
3. Run migration with `npm run migrate`
4. Test both up and down migrations

### API Documentation
- All endpoints documented with Swagger/OpenAPI 3.0
- Access documentation at `/api-docs` when server is running
- Include request/response schemas and error responses