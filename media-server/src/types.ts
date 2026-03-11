
export type VidemusError = (
  | { type: "ResourceNotFound", }
  | { type: "NotAvailable", }
  | { type: "Unexpected", }
)  & { message: string; }

export type VidemusResult<T> =
  { success: true, data: T }
| { success: false, error: VidemusError }
