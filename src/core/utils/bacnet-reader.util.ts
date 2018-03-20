import * as _ from 'lodash';

import { ApiError } from '../errors';

import {
    BACnetPropIds,
    BACnetPropTypes,
    BACnetTagTypes,
    getStringEncode,
} from '../enums';

import { OffsetUtil } from './offset.util';
import { TyperUtil } from './typer.util';

export class BACnetReaderUtil {
    public offset: OffsetUtil;

    constructor (private buffer: Buffer) {
        this.offset = new OffsetUtil(0);
    }

    /**
     * getRange - returns the part of buffer from "start" to the "end" position.
     *
     * @param  {number} start - start position
     * @param  {number} end - end position
     * @return {Buffer}
     */
    public getRange (start: number, end?: number): Buffer {
        return this.buffer.slice(start, end);
    }

    /**
     * readUInt8 - reads the 1 byte from the internal buffer.
     *
     * @return {number}
     */
    public readUInt8 (changeOffset: boolean = true): number {
        const offset = this.offset.getVaule();
        return changeOffset
            ? this.buffer.readUInt8(this.offset.inc())
            : this.buffer.readUInt8(offset);
    }

    /**
     * readUInt16BE - reads the 2 bytes from the internal buffer.
     *
     * @return {number}
     */
    public readUInt16BE (changeOffset: boolean = true): number {
        const offset = this.offset.getVaule();
        return changeOffset
            ? this.buffer.readUInt16BE(this.offset.inc(2))
            : this.buffer.readUInt16BE(offset);
    }

    /**
     * readUInt32BE - reads the 4 bytes (int) from the internal buffer.
     *
     * @return {number}
     */
    public readUInt32BE (changeOffset: boolean = true): number {
        const offset = this.offset.getVaule();
        return changeOffset
            ? this.buffer.readUInt32BE(this.offset.inc(4))
            : this.buffer.readUInt32BE(offset);
    }

    /**
     * readFloatBE - reads the 4 bytes (float) from the internal buffer.
     *
     * @return {number}
     */
    public readFloatBE (changeOffset: boolean = true): number {
        const offset = this.offset.getVaule();
        return changeOffset
            ? this.buffer.readFloatBE(this.offset.inc(4))
            : this.buffer.readFloatBE(offset);
    }

    /**
     * readString - reads the N bytes from the internal buffer and converts
     * the result to the string.
     *
     * @param  {string} encoding - character encoding
     * @param  {number} len - lenght of string
     * @return {string}
     */
    public readString (encoding: string, len: number, changeOffset: boolean = true): string {
        let offStart: number, offEnd: number;
        if (changeOffset) {
            offStart = this.offset.inc(len);
            offEnd = this.offset.getVaule();
        } else {
            offStart = this.offset.getVaule();
            offEnd = offStart + len;
        }
        return this.buffer.toString(encoding, offStart, offEnd);
    }

    /**
     * readTag - reads the BACnet tag from the internal buffer and returns map with:
     * - number = tag number (number)
     * - class = tag class (number)
     * - value = tag value (number)
     *
     * @return {Map<string, number>}
     */
    public readTag (changeOffset: boolean = true): Map<string, number> {
        const typeMap: Map<string, number> = new Map();

        const tag = this.readUInt8(changeOffset);

        const tagNumber = tag >> 4;
        typeMap.set('number', tagNumber);

        const tagClass = (tag >> 3) & 0x01;
        typeMap.set('class', tagClass);

        const tagValue = tag & 0x07;
        typeMap.set('value', tagValue);

        return typeMap;
    }


    /**
     * readObjectIdentifier - reads the BACnet object identifier from the internal
     * buffer and returns map with:
     * - tag = param tag (tag map)
     * - type = object type (number)
     * - instance = object instance (number)
     *
     * @return {Map<string, any>}
     */
    public readObjectIdentifier (changeOffset: boolean = true): Map<string, any> {
        const objMap: Map<string, any> = new Map();

        const tag = this.readTag(changeOffset);
        objMap.set('tag', tag);

        const objIdent = this.readUInt32BE(changeOffset);
        const objValue = this.decodeObjectIdentifier(objIdent);
        objMap.set('value', objValue);

        return objMap;
    }

    /**
     * decodeObjectIdentifier - decodes the Object Identifier and returns the
     * map with object type and object instance.
     *
     * @param  {number} objIdent - 4 bytes of object identifier
     * @return {Map<string, any>}
     */
    public decodeObjectIdentifier (objIdent: number): Map<string, any> {
        const objMap: Map<string, any> = new Map();
        const objType = (objIdent >> 22) & 0x03FF;
        objMap.set('type', objType);

        const objInstance = objIdent & 0x03FFFFF;
        objMap.set('instance', objInstance);

        return objMap;
    }

    /**
     * readParam - reads the BACnet param from the internal buffer and returns
     * map with:
     * - tag = param tag (tag map)
     * - value = param value (number)
     *
     * @return {Map<string, any>}
     */
    public readParam (changeOffset: boolean = true): Map<string, any> {
        const paramMap: Map<string, any> = new Map();

        const tag = this.readTag(changeOffset);
        paramMap.set('tag', tag);

        let param;
        const len: number = tag.get('value');
        if (len === 1) {
            param = this.readUInt8(changeOffset);
        } else if (len === 2) {
            param = this.readUInt16BE(changeOffset);
        } else if (len === 4) {
            param = this.readUInt32BE(changeOffset);
        }

        paramMap.set('value', param);

        return paramMap;
    }

    /**
     * readProperty - reads the BACnet property from the internal buffer and
     * returns map with:
     * - tag = param tag (tag map)
     * - value = param value (number)
     * - name = param name (string)
     *
     * @return {Map<string, any>}
     */
    public readProperty (): Map<string, any> {
        const propMap: Map<string, any> = this.readParam();

        const propValue: number = propMap.get('value');
        const propName: string = BACnetPropIds[propValue];
        propMap.set('name', propName);

        return propMap;
    }

    /**
     * readParamValue - reads the param value from internal buffer.
     *
     * @return {Map<string, any>}
     */
    public readParamValue (changeOffset: boolean = true): Map<string, any> {
        const paramValuesMap: Map<string, any> = new Map();

        // Context Number - Context tag - "Opening" Tag
        const openTag = this.readTag(changeOffset);

        const values: Map<string, any>[] = [];
        while (true) {
            const tag = this.readTag(changeOffset);

            if (this.isClosingTag(tag)) {
                // Context Number - Context tag - "Closing" Tag
                break;
            }

            const paramValueMap: Map<string, any> = new Map();

            // Value Type - Application tag - any
            paramValueMap.set('tag', tag);

            const paramValueType: BACnetPropTypes = tag.get('number');

            let paramValue: any;
            switch (paramValueType) {
                case BACnetPropTypes.boolean:
                    paramValue = this.readParamValueBoolean(tag, changeOffset);
                    break;
                case BACnetPropTypes.unsignedInt:
                    paramValue = this.readParamValueUnsignedInt(tag, changeOffset);
                    break;
                case BACnetPropTypes.real:
                    paramValue = this.readParamValueReal(tag, changeOffset);
                    break;
                case BACnetPropTypes.characterString:
                    paramValue = this.readParamValueCharacterString(tag, changeOffset);
                    break;
                case BACnetPropTypes.bitString:
                    paramValue = this.readParamValueBitString(tag, changeOffset);
                    break;
                case BACnetPropTypes.enumerated:
                    paramValue = this.readParamValueEnumerated(tag, changeOffset);
                    break;
                case BACnetPropTypes.objectIdentifier:
                    paramValue = this.readParamValueObjectIdentifier(tag, changeOffset);
                    break;
            }

            paramValueMap.set('value', paramValue);
            values.push(paramValueMap);
        }

        paramValuesMap.set('values', values);

        return paramValuesMap;
    }

    /**
     * readParamValueBoolean - reads the boolean param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueBoolean (tag: Map<string, number>, changeOffset: boolean = true) {
        return {
            value: !!tag.get('value'),
        };
    }

    /**
     * readParamValueUnsignedInt - reads the unsigned int param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueUnsignedInt (tag: Map<string, number>, changeOffset: boolean = true) {
        return {
            value: this.readUInt8(changeOffset),
        };
    }

    /**
     * readParamValueReal - reads the real param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueReal (tag: Map<string, number>, changeOffset: boolean = true) {
        return {
            value: this.readFloatBE(changeOffset),
        };
    }

    /**
     * readParamValueCharacterString - reads the char string value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueCharacterString (tag: Map<string, number>, changeOffset: boolean = true) {
        const strLen = this.readUInt8(changeOffset);
        const charSet = this.readUInt8(changeOffset);

        // Get the character encoding
        const charEncode = getStringEncode(charSet);

        return {
            encoding: charEncode,
            value: this.readString(charEncode, strLen - 1, changeOffset),
        };
    }

    /**
     * readParamValueBitString - reads the bit string value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueBitString (tag: Map<string, number>, changeOffset: boolean = true) {
        // Read the bitString as status flag
        // Unused byte - show the mask of unused bites
        const unusedBits = this.readUInt8(changeOffset);
        // Contains the status bits
        const statusByte = this.readUInt8(changeOffset);
        const statusMap: Map<string, boolean> = new Map();

        const inAlarm = TyperUtil.getBit(statusByte, 7);
        const fault = TyperUtil.getBit(statusByte, 6);
        const overridden = TyperUtil.getBit(statusByte, 5);
        const outOfService = TyperUtil.getBit(statusByte, 4);

        return {
            inAlarm: !!inAlarm,
            fault: !!fault,
            overridden: !!overridden,
            outOfService: !!outOfService
        };
    }

    /**
     * readParamValueEnumerated - reads the enumerated value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueEnumerated (tag: Map<string, number>, changeOffset: boolean = true) {
        return {
            value: this.readUInt8(changeOffset),
        };
    }

    /**
     * readParamValueObjectIdentifier - reads the object identifier value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueObjectIdentifier (tag: Map<string, number>, changeOffset: boolean = true) {
        const objIdent = this.readUInt32BE(changeOffset);

        const objMap: Map<string, any> =
        this.decodeObjectIdentifier(objIdent);

        return {
            type: objMap.get('type'),
            instance: objMap.get('instance'),
        };
    }

    /**
     * isOpeningTag - return true if tag is an opening tag
     *
     * @param  {Map<string,number>} tag - tag
     * @return {boolean}
     */
    public isOpeningTag (tag: Map<string, number>): boolean {
        return tag.get('class') === BACnetTagTypes.context
            && tag.get('value') === 0x06;
    }

    /**
     * isClosingTag - return true if tag is a closing tag
     *
     * @param  {Map<string,number>} tag - tag
     * @return {boolean}
     */
    public isClosingTag (tag: Map<string, number>): boolean {
        return tag.get('class') === BACnetTagTypes.context
            && tag.get('value') === 0x07;
    }
}
