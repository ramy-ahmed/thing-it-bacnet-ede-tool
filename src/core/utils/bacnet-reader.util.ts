import * as _ from 'lodash';

import { ApiError } from '../errors';

import {
    IBACnetTag,
    IBACnetParam,
    IBACnetTypeObjectId,
} from '../interfaces';

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
    public readTag (changeOffset: boolean = true): IBACnetTag {
        let tagData: IBACnetTag;

        const tag = this.readUInt8(changeOffset);

        const tagNumber = tag >> 4;

        const tagType = (tag >> 3) & 0x01;

        const tagValue = tag & 0x07;

        tagData = {
            num: tagNumber,
            type: tagType,
            value: tagValue,
        }

        return tagData;
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
    public readObjectIdentifier (changeOffset: boolean = true): IBACnetParam {
        let objIdData: IBACnetParam;

        const tag = this.readTag(changeOffset);

        const objId = this.readUInt32BE(changeOffset);
        const objIdPayload = this.decodeObjectIdentifier(objId);

        objIdData = {
            tag: tag,
            payload: objIdPayload,
        };

        return objIdData;
    }

    /**
     * decodeObjectIdentifier - decodes the Object Identifier and returns the
     * map with object type and object instance.
     *
     * @param  {number} objId - 4 bytes of object identifier
     * @return {Map<string, any>}
     */
    public decodeObjectIdentifier (objId: number): IBACnetTypeObjectId {
        let objIdPayload: IBACnetTypeObjectId;
        const objType = (objId >> 22) & 0x03FF;

        const objInstance = objId & 0x03FFFFF;

        objIdPayload = {
            type: objType,
            instance: objInstance,
        };

        return objIdPayload;
    }

    /**
     * readParam - reads the BACnet param from the internal buffer and returns
     * map with:
     * - tag = param tag (tag map)
     * - value = param value (number)
     *
     * @return {Map<string, any>}
     */
    public readParam (changeOffset: boolean = true): IBACnetParam {
        let paramData: IBACnetParam;

        const paramTag = this.readTag(changeOffset);

        let paramPayload = this.readParamValueUnsignedInt(paramTag, changeOffset);

        paramData = {
            tag: paramTag,
            payload: paramPayload,
        };

        return paramData;
    }

    /**
     * readParamValue - reads the param value from internal buffer.
     *
     * @return {Map<string, any>}
     */
    public readParamValue (changeOffset: boolean = true): IBACnetParam[] {
        const paramValuesMap: Map<string, any> = new Map();

        // Context Number - Context tag - "Opening" Tag
        const openTag = this.readTag(changeOffset);

        const paramValues: IBACnetParam[] = [];
        while (true) {
            const paramValueTag = this.readTag(changeOffset);

            if (this.isClosingTag(paramValueTag)) {
                // Context Number - Context tag - "Closing" Tag
                break;
            }
            // Value Type - Application tag - any

            let paramValue: IBACnetParam;

            const paramValueType: BACnetPropTypes = paramValueTag.num;

            let paramValuePayload: any;
            switch (paramValueType) {
                case BACnetPropTypes.boolean:
                    paramValuePayload = this.readParamValueBoolean(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.unsignedInt:
                    paramValuePayload = this.readParamValueUnsignedInt(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.real:
                    paramValuePayload = this.readParamValueReal(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.characterString:
                    paramValuePayload = this.readParamValueCharacterString(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.bitString:
                    paramValuePayload = this.readParamValueBitString(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.enumerated:
                    paramValuePayload = this.readParamValueEnumerated(paramValueTag, changeOffset);
                    break;
                case BACnetPropTypes.objectIdentifier:
                    paramValuePayload = this.readParamValueObjectIdentifier(paramValueTag, changeOffset);
                    break;
            }

            paramValue = {
                tag: paramValueTag,
                payload: paramValuePayload,
            };
            paramValues.push(paramValue);
        }

        return paramValues;
    }

    /**
     * readParamValueBoolean - reads the boolean param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueBoolean (tag: IBACnetTag, changeOffset: boolean = true) {
        return {
            value: !!tag.value,
        };
    }

    /**
     * readParamValueUnsignedInt - reads the unsigned int param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueUnsignedInt (tag: IBACnetTag, changeOffset: boolean = true) {
        let value: number;
        switch (tag.value) {
            case 1:
                value = this.readUInt8(changeOffset);
                break;
            case 2:
                value = this.readUInt16BE(changeOffset);
                break;
            case 4:
                value = this.readUInt32BE(changeOffset);
                break;
        }

        return {
            value: value,
        };
    }

    /**
     * readParamValueReal - reads the real param value from internal buffer.
     *
     * @param  {Map<string, number>} tag - param tag
     * @return {Map<string, any>}
     */
    public readParamValueReal (tag: IBACnetTag, changeOffset: boolean = true) {
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
    public readParamValueCharacterString (tag: IBACnetTag, changeOffset: boolean = true) {
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
    public readParamValueBitString (tag: IBACnetTag, changeOffset: boolean = true) {
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
    public readParamValueEnumerated (tag: IBACnetTag, changeOffset: boolean = true) {
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
    public readParamValueObjectIdentifier (tag: IBACnetTag, changeOffset: boolean = true) {
        const objId = this.readUInt32BE(changeOffset);

        const objIdPayload = this.decodeObjectIdentifier(objId);

        return objIdPayload;
    }

    /**
     * isOpeningTag - return true if tag is an opening tag
     *
     * @param  {Map<string,number>} tag - tag
     * @return {boolean}
     */
    public isOpeningTag (tag: IBACnetTag): boolean {
        return tag.type === BACnetTagTypes.context
            && tag.value === 0x06;
    }

    /**
     * isClosingTag - return true if tag is a closing tag
     *
     * @param  {Map<string,number>} tag - tag
     * @return {boolean}
     */
    public isClosingTag (tag: IBACnetTag): boolean {
        return tag.type === BACnetTagTypes.context
            && tag.value === 0x07;
    }
}
