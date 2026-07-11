/**
 * Safe FormData Utility to mitigate CWE-93 (CRLF Injection) vulnerabilities.
 * 
 * In older versions of form-data (up to v4.0.5), carriage returns (\r) and
 * line feeds (\n) inside field names or filenames could be used by attackers
 * to terminate header lines and inject arbitrary headers or split HTTP payloads.
 * 
 * This module exports strict validation functions and a secure wrapper class.
 */

/**
 * Validates a form-data field name, throwing an error if it contains CRLF characters.
 */
export function validateFieldName(name: string): void {
  if (/[\r\n]/.test(name)) {
    throw new Error('invalid field name: CRLF characters detected');
  }
}

/**
 * Validates a form-data filename, throwing an error if it contains CRLF characters.
 */
export function validateFilename(filename: string): void {
  if (/[\r\n]/.test(filename)) {
    throw new Error('invalid filename: CRLF characters detected');
  }
}

/**
 * Sanitizes an input string by stripping out carriage returns and line feeds.
 */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

/**
 * A safe, secure wrapper over standard FormData that performs automatic input validation.
 */
export class SafeFormData {
  private formData: FormData;

  constructor(formElement?: HTMLFormElement) {
    this.formData = new FormData(formElement);
    this.validateExistingFields();
  }

  /**
   * Validates all current entries in the FormData instance.
   */
  private validateExistingFields(): void {
    if (typeof this.formData.forEach === 'function') {
      this.formData.forEach((value, key) => {
        validateFieldName(key);
        if (value instanceof File) {
          validateFilename(value.name);
        }
      });
    }
  }

  /**
   * Securely appends a value to the form data, performing CWE-93 validation.
   */
  public append(name: string, value: string | Blob, filename?: string): void {
    validateFieldName(name);
    if (filename !== undefined) {
      validateFilename(filename);
    }
    
    if (filename) {
      this.formData.append(name, value, filename);
    } else {
      this.formData.append(name, value);
    }
  }

  /**
   * Returns the underlying, fully validated standard FormData object.
   */
  public getFormData(): FormData {
    return this.formData;
  }
}
