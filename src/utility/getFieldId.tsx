import { FieldAppSDK } from "@contentful/app-sdk";

// Utility to get fallback IDs safely
const getFieldId = (sdk: FieldAppSDK, fallback: string, filter: (f: any) => boolean) =>
  sdk.contentType.fields.find(filter)?.id || fallback;

export default getFieldId;