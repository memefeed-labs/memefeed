
// TODO: Move all of this celestia logic to celestia-client-ts after writing a complete one
interface Blob {
    namespace: string;
    data: string;
    share_version: number;
    commitment: string;
    index: number;
}

function getBlob(data: string, namespace: string): Blob[] {
    return [{
        namespace,
        data,
        share_version: 0,
        commitment: '0'.repeat(64), // TODO: Implement commitment generation
        index: 0,
    }];
}

function stringToHex(str: string): string {
    return Array.from(str).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

function getNamespace(): string {
    const DEFAULT_NAMESPACE = 'memefeed';
    const dataHex = stringToHex(DEFAULT_NAMESPACE);

    // Ensure the hex string fits within 10 bytes (20 hex characters)
    const maxLength = 20;
    const paddedDataHex = dataHex.padEnd(maxLength, '0').slice(0, maxLength);

    // Prepend with 18 bytes of zeros (36 hex characters)
    const namespace = '0'.repeat(36) + paddedDataHex;

    return namespace;
}

export {
    getBlob,
    getNamespace,
}