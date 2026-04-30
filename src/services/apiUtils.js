/**
 * Extracts a human-readable error message from an Axios error.
 *
 * Django REST Framework can return errors in several shapes:
 *   { detail: "Not found." }
 *   { error: "Something went wrong." }
 *   { non_field_errors: ["Invalid credentials."] }
 *   { email: ["This field is required."] }   ← field-level validation
 *
 * This function normalises all of them into a single string so every
 * service file throws a consistent Error.
 */
export function parseApiError(err) {
  const data = err.response?.data;

  if (data) {
    if (typeof data === "string" && data.length) return data;
    if (data.detail)                             return data.detail;
    if (data.error)                              return data.error;
    if (data.message)                            return data.message;
    if (data.non_field_errors?.length)           return data.non_field_errors[0];

    // Field-level validation — return the first field's first message
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  }

  return err.message || "An unexpected error occurred. Please try again.";
}
