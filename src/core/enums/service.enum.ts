export enum BACnetConfirmedService {
    SubscribeCOV = 0x05,
    ReadProperty = 0x0c,
    WriteProperty = 0x0f,
}

export enum BACnetUnconfirmedService {
    iAm = 0x00,
    covNotification = 0x02,
    whoIs = 0x08,
}

export enum BACnetServiceTypes {
    ConfirmedReqPDU = 0x00,
    UnconfirmedReqPDU = 0x01,
    SimpleACKPDU = 0x02,
    ComplexACKPDU = 0x03,
}

export enum BACnetTagTypes {
    application = 0,
    context = 1,
}
