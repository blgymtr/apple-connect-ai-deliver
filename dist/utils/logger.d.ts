export declare const logger: {
    info: (message: string) => void;
    success: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    group: (name: string, fn: () => void | Promise<void>) => void;
    endGroup: () => void;
    maskSecret: (secret: string) => void;
};
