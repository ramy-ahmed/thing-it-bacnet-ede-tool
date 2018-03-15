export enum BACnetPropTypes {
    boolean = 1,
    unsignedInt = 2,
    real = 4,
    characterString = 7,
    bitString = 8,
    enumerated = 9,
    objectIdentifier = 12,
}

export function getStringEncode (charSet: number): string {
    switch (charSet) {
        case 0:
        default:
            return 'utf8';
    }
}
