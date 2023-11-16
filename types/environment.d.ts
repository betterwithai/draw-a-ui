// types/environment.d.ts
declare namespace NodeJS {
    export interface ProcessEnv {
      NODE_ENV: string;
      OPENAI_API_KEY: string;
      BASIC_AUTH_USERNAME: string;
      BASIC_AUTH_PASSWORD: string;
      // Add other environment variables as needed
    }
  }
  