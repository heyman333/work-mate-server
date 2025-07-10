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
            skillSet: {
              type: "string",
              description: "User's skill set",
            },
            githubUrl: {
              type: "string",
              description: "GitHub profile URL",
            },
            linkedinUrl: {
              type: "string",
              description: "LinkedIn profile URL",
            },
            company: {
              type: "string",
              description: "User's company/organization",
            },
            mbti: {
              type: "string",
              description: "User's MBTI type",
            },
            collaborationGoal: {
              type: "string",
              description: "User's collaboration goal (max 1000 characters)",
              maxLength: 1000,
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
            skillSet: {
              type: "string",
              description: "User's skill set",
            },
            githubUrl: {
              type: "string",
              description: "GitHub profile URL",
            },
            linkedinUrl: {
              type: "string",
              description: "LinkedIn profile URL",
            },
            company: {
              type: "string",
              description: "User's company/organization",
            },
            mbti: {
              type: "string",
              description: "User's MBTI type",
            },
            collaborationGoal: {
              type: "string",
              description: "User's collaboration goal (max 1000 characters)",
              maxLength: 1000,
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
            skillSet: {
              type: "string",
              description: "User's skill set",
            },
            githubUrl: {
              type: "string",
              description: "GitHub profile URL",
            },
            linkedinUrl: {
              type: "string",
              description: "LinkedIn profile URL",
            },
            company: {
              type: "string",
              description: "User's company/organization",
            },
            mbti: {
              type: "string",
              description: "User's MBTI type",
            },
            collaborationGoal: {
              type: "string",
              description: "User's collaboration goal (max 1000 characters)",
              maxLength: 1000,
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
              type: "array",
              description: "Array of descriptions with dates",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    format: "date-time",
                    description: "Date of the description entry",
                  },
                  content: {
                    type: "string",
                    description: "Description content",
                  },
                },
                required: ["date", "content"],
              },
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
