// ============================================
// LEGACY AUTH STYLES (for backward compatibility)
// ============================================

import * as webStyles from './web.styles'

// Re-export common styles for backward compatibility
export { formFields, authText } from './common.styles'

// Re-export web helper functions
export { getInputStyles, getRegisterInputStyles, getButtonStyles } from './web.styles'

// Legacy authStyles export for backward compatibility
// This maintains the old structure for existing code
export const authStyles = {
  // Web styles
  container: webStyles.container,
  typography: webStyles.typography,
  form: webStyles.form,
  input: webStyles.input,
  button: webStyles.button,
  alert: webStyles.alert,
}

// Note: This file is maintained for backward compatibility.
// For new code, please import directly from:
// - './common.styles' for shared constants
// - './web.styles' for web-specific styles