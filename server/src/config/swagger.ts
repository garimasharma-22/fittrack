import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  failOnErrors: true,
  definition: {
    openapi: "3.0.3",
    info: {
      title: "FitTrack API",
      version: "1.0.0",
      description:
        "API documentation for the FitTrack gym management system",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "fittrack_token",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;