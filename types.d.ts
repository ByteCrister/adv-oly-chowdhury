// types.d.ts
import { Connection, Types as MongooseTypes } from "mongoose";

declare global {
    // This will persist across hot reloads in dev/serverless
    var mongoose: {
        Types: typeof MongooseTypes | null;
        connection: Connection | null;
        promise: Promise<Connection> | null;
    };
}

export { };
