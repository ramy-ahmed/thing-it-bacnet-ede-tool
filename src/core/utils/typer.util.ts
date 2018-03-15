import * as _ from 'lodash';

import { ApiError } from '../errors';

export class TyperUtil {

    /**
     * setBit - sets the bit value in specific position.
     *
     * @param  {number} bitMap - old value
     * @param  {number} pos - bit position
     * @param  {number} bitValue - new bit value
     * @return {number}
     */
    static setBit (bitMap: number, pos: number, bitValue: boolean): number {
        const byte = 0x01 << pos;
        const mask = bitValue ? byte : ~byte;
        return bitValue ? (bitMap | mask) : (bitMap & mask);
    }

    /**
     * getBit - returns the bit value in specific position.
     *
     * @param  {number} bitMap - value
     * @param  {number} pos - bit position
     * @return {number}
     */
    static getBit (bitMap: number, pos: number): number {
        return (bitMap >> pos) & 0x01;
    }

    /**
     * getBitRange - returns the value in specific range of bits.
     *
     * @param  {number} bitMap - old value
     * @param  {number} startPos - start position
     * @param  {number} len - number of bits
     * @return {number}
     */
    static getBitRange (bitMap: number, startPos: number, len: number): number {
        const mask = Math.pow(2, len) - 1;
        return (bitMap >> startPos) & mask;
    }

    /**
     * setBitRange - sets the value in specific range of bits.
     *
     * @param  {number} bitMap - old value
     * @param  {number} newValue - new value for range
     * @param  {number} startPos - start position
     * @param  {number} len - number of bits
     * @return {number}
     */
    static setBitRange (bitMap: number, newValue: number,
            startPos: number, len: number): number {
        const mask = Math.pow(2, len) - 1;
        const newValueMask = (newValue & mask) << startPos;
        const bitMapMask = ~(mask << startPos);
        return (bitMap & bitMapMask) | newValueMask;
    }

    /**
     * getByte - returns the byte value in specific position.
     *
     * @param  {number} value - value
     * @param  {number} pos - byte position
     * @return {number}
     */
    static getByte (value: number, pos: number): number {
        const byte: number = (value >> (pos * 8)) & 0x0F;
        return byte;
    }

    /**
     * getWord - returns the word value in specific position.
     *
     * @param  {number} value - value
     * @param  {number} pos - word position
     * @return {number}
     */
    static getWord (value: number, pos: number): number {
        const word: number = (value >> (pos * 16)) & 0xFF;
        return word;
    }
}
