// The models touch localStorage for the one-phone saved game, always inside try/catch. Workers have no
// localStorage: there the access throws, is caught, and nothing is saved. Declared so the models
// type-check here; never use it in server code.
declare const localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
};
