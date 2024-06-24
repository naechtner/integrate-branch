export const TEST_PATTERN =
    /integrate_(?<base>[a-zA-Z/.-_0-9]+)_(?<identifier>[^_]+)/;

export function getAllMethodNames(obj: Object): string[] {
    const methods: Set<string> = new Set();

    let prototypeOfCurrent = Object.getPrototypeOf(obj);
    while (prototypeOfCurrent) {
        const methodNames = Object.getOwnPropertyNames(
            prototypeOfCurrent
        ).filter(
            (propName) =>
                typeof prototypeOfCurrent[
                    propName as keyof typeof prototypeOfCurrent
                ] === 'function'
        );
        for (const methodName of methodNames) {
            methods.add(methodName);
        }
        prototypeOfCurrent = Object.getPrototypeOf(prototypeOfCurrent);
    }

    return [...methods];
}
