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
    public readUInt8 (): number {
        return this.buffer.readUInt8(this.offset.inc());
    }

    /**
     * readUInt16BE - reads the 2 bytes from the internal buffer.
     *
     * @return {number}
     */
    public readUInt16BE (): number {
        return this.buffer.readUInt16BE(this.offset.inc(2));
    }

    /**
     * readUInt32BE - reads the 4 bytes (int) from the internal buffer.
     *
     * @return {number}
     */
    public readUInt32BE (): number {
        return this.buffer.readUInt32BE(this.offset.inc(4));
    }

    /**
     * readFloatBE - reads the 4 bytes (float) from the internal buffer.
     *
     * @return {number}
     */
    public readFloatBE (): number {
        return this.buffer.readFloatBE(this.offset.inc(4));
    }

    /**
     * readString - reads the N bytes from the internal buffer and converts
     * the result to the string.
     *
     * @param  {string} encoding - character encoding
     * @param  {number} len - lenght of string
     * @return {string}
     */
    public readString (encoding: string, len: number): string {
        const offStart = this.offset.inc(len);
        const offEnd = this.offset.getVaule();
        return this.buffer.toString(encoding, offStart, offEnd);
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
    public readObjectIdentifier (): Map<string, any> {
        const objMap: Map<string, any> = new Map();

        const tag = this.readTag();
        objMap.set('tag', tag);

        const objIdent = this.readUInt32BE();
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
    public readParam (): Map<string, any> {
        const paramMap: Map<string, any> = new Map();

        const tag = this.readTag();
        paramMap.set('tag', tag);

        let param;
        const len: number = tag.get('value');
        if (len === 1) {
            param = this.readUInt8();
        } else if (len === 2) {
            param = this.readUInt16BE();
        } else if (len === 4) {
            param = this.readUInt32BE();
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
     * readListOfParams - stub
     */
    public readListOfParams (): Map<string, any> {
        const paramMap: Map<string, any> = new Map();

        const openTag = this.readTag();

        const property = this.readProperty();
        paramMap.set('property', property);

        const propertyValue = this.readParamValue();
        paramMap.set('propertyValue', propertyValue);

        const statusFlags = this.readProperty();
        paramMap.set('statusFlags', statusFlags);

        const statusFlagsValue = this.readParamValue();
        paramMap.set('statusFlagsValue', statusFlagsValue);

        const closeTag = this.readTag();

        return paramMap;
    }

    /**
     * readParamValue - reads the param value from internal buffer.
     *
     * @return {Map<string, any>}
     */
    public readParamValue (): Map<string, any> {
        const paramValuesMap: Map<string, any> = new Map();

        // Context Number - Context tag - "Opening" Tag
        const openTag = this.readTag();

        const values: Map<string, any>[] = [];
        while (true) {
            const tag = this.readTag();

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
                    paramValue = this.readParamValueBoolean(tag);
                    break;
                case BACnetPropTypes.unsignedInt:
                    paramValue = this.readParamValueUnsignedInt(tag);
                    break;
                case BACnetPropTypes.real:
                    paramValue = this.readParamValueReal(tag);
                    break;
                case BACnetPropTypes.characterString:
                    paramValue = this.readParamValueCharacterString(tag);
                    break;
                case BACnetPropTypes.bitString:
                    paramValue = this.readParamValueBitString(tag);
                    break;
                case BACnetPropTypes.enumerated:
                    paramValue = this.readParamValueEnumerated(tag);
                    break;
                case BACnetPropTypes.objectIdentifier:
                    paramValue = this.readParamValueObjectIdentifier(tag);
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
    public readParamValueBoolean (tag: Map<string, number>) {
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
    public readParamValueUnsignedInt (tag: Map<string, number>) {
        return {
            value: this.readUInt8(),
        };
    }

    /**
     * readParamValueReal - reads the real param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueReal (tag: Map<string, number>) {
        return {
            value: this.readFloatBE(),
        };
    }

    /**
     * readParamValueCharacterString - reads the char string value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueCharacterString (tag: Map<string, number>) {
        const strLen = this.readUInt8();
        const charSet = this.readUInt8();

        // Get the character encoding
        const charEncode = getStringEncode(charSet);

        return {
            encoding: charEncode,
            value: this.readString(charEncode, strLen - 1),
        };
    }

    /**
     * readParamValueBitString - reads the bit string value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueBitString (tag: Map<string, number>) {
        // Read the bitString as status flag
        // Unused byte - show the mask of unused bites
        const unusedBits = this.readUInt8();
        // Contains the status bits
        const statusByte = this.readUInt8();
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
    public readParamValueEnumerated (tag: Map<string, number>) {
        return {
            value: this.readUInt8(),
        };
    }

    /**
     * readParamValueObjectIdentifier - reads the object identifier value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueObjectIdentifier (tag: Map<string, number>) {
        const objIdent = this.readUInt32BE();

        const objMap: Map<string, any> =
        this.decodeObjectIdentifier(objIdent);

        return {
            type: objMap.get('type'),
            instance: objMap.get('instance'),
        };
    }

    /**
     * readTag - reads the BACnet tag from the internal buffer and returns map with:
     * - number = tag number (number)
     * - class = tag class (number)
     * - value = tag value (number)
     *
     * @return {Map<string, number>}
     */
    public readTag (): Map<string, number> {
        const typeMap: Map<string, number> = new Map();

        const tag = this.readUInt8();

        const tagNumber = tag >> 4;
        typeMap.set('number', tagNumber);

        const tagClass = (tag >> 3) & 0x01;
        typeMap.set('class', tagClass);

        const tagValue = tag & 0x07;
        typeMap.set('value', tagValue);

        return typeMap;
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
