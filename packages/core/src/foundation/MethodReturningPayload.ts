import { Payload, Returning } from '../types';

export class MethodReturningPayload implements Payload<Returning> {
    constructor(
        private readonly data: Returning,
        private readonly namespace: string,
        private readonly methodName: string
    ) {}
    newPayload(data: Returning): Payload<Returning> {
        return new MethodReturningPayload(data, this.namespace, this.methodName);
    }
    serialize(): Returning {
        return this.data;
    }
    getMethodName() {
        return this.methodName;
    }
    getNamespace() {
        return this.namespace;
    }
}
