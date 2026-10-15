// lib/helpers/withTransaction.ts
import mongoose, { ClientSession } from "mongoose";

export async function withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
    externalSession?: ClientSession
): Promise<T> {
    // If already inside a transaction → reuse
    if (externalSession) {
        return fn(externalSession);
    }

    const session = await mongoose.startSession();

    try {
        let result!: T;

        await session.withTransaction(async () => {
            result = await fn(session);
        });

        return result;
    } finally {
        session.endSession();
    }
}