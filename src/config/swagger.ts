import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";
import YAML from "yaml";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Work Mate Server API",
      version: "1.0.0",
      description: "API documentation for Work Mate Server",
    },
    servers: [
      {
        url: process.env.SERVER_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            name: {
              type: "string",
              description: "User name",
            },
            profileImage: {
              type: "string",
              description: "User profile image URL",
            },
            githubId: {
              type: "string",
              description: "GitHub ID",
            },
            googleId: {
              type: "string",
              description: "Google ID",
            },
          },
        },
        UserJoinRequest: {
          type: "object",
          required: ["email", "name"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            name: {
              type: "string",
              description: "User name",
            },
            profileImage: {
              type: "string",
              description: "User profile image URL",
            },
            githubId: {
              type: "string",
              description: "GitHub ID",
            },
            googleId: {
              type: "string",
              description: "Google ID",
            },
          },
        },
        UserCheckRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            githubId: {
              type: "string",
              description: "GitHub ID",
            },
            googleId: {
              type: "string",
              description: "Google ID",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Health status",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Timestamp",
            },
          },
        },
        WorkPlace: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Work place ID",
            },
            name: {
              type: "string",
              description: "Work place name",
            },
            latitude: {
              type: "number",
              description: "Latitude coordinate",
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate",
            },
            description: {
              type: "string",
              description: "Description of work being done at this place",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        WorkPlaceCreateRequest: {
          type: "object",
          required: ["name", "latitude", "longitude"],
          properties: {
            name: {
              type: "string",
              description: "Work place name",
            },
            latitude: {
              type: "number",
              description: "Latitude coordinate",
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate",
            },
            description: {
              type: "string",
              description: "Description of work being done at this place",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/app.ts"],
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  // YAML 파일 서빙
  app.get("/swagger.yaml", (_req, res) => {
    res.setHeader("Content-Type", "application/x-yaml");
    res.send(YAML.stringify(specs));
  });
};

export default specs;
