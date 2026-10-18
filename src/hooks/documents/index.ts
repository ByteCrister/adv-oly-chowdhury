export * from "./queries/useDocumentsQuery";
export * from "./queries/useDocumentDetailQuery";
export * from "./mutations/useCreateCaseDocumentMutation";
export * from "./mutations/useCreateClientDocumentMutation";
export * from "./mutations/useUpdateDocumentMutation";
export * from "./mutations/useDeleteDocumentMutation";
export {
  useUploadDocument,
  mapCaseDocTypeToPurpose,
  mapClientDocTypeToPurpose,
  type UploadAndCreateCaseDocumentInput,
  type UploadAndCreateClientDocumentInput,
  type UploadAndReplaceUnifiedDocumentInput,
} from "./useUploadDocument";
