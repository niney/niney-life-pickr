import { Alert as RNAlert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

/**
 * Cross-platform Alert utility
 * Works on both web and mobile platforms
 */
class AlertUtil {
  /**
   * Shows an alert dialog
   * @param title - The dialog's title
   * @param message - An optional message that appears below the title
   * @param buttons - An optional array of buttons
   * @param options - An optional Alert configuration
   */
  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void {
    if (Platform.OS === 'web') {
      // Web implementation
      this.webAlert(title, message, buttons);
    } else {
      // Mobile implementation (iOS/Android)
      RNAlert.alert(title, message, buttons, options);
    }
  }

  private static webAlert(
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ): void {
    // Simple implementation for web
    if (!buttons || buttons.length === 0) {
      // Simple alert with OK button
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }

    // For web, we'll use confirm for 2 buttons or alert for 1 button
    if (buttons.length === 1) {
      window.alert(message ? `${title}\n\n${message}` : title);
      const button = buttons[0];
      if (button.onPress) {
        button.onPress();
      }
    } else if (buttons.length === 2) {
      // Use confirm for yes/no type dialogs
      const result = window.confirm(message ? `${title}\n\n${message}` : title);
      if (result) {
        // User clicked OK/Yes (first button)
        const button = buttons[0];
        if (button.onPress) {
          button.onPress();
        }
      } else {
        // User clicked Cancel/No (second button)
        const button = buttons[1];
        if (button.onPress) {
          button.onPress();
        }
      }
    } else {
      // For more than 2 buttons, use prompt with button text
      const buttonTexts = buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
      const promptMessage = message
        ? `${title}\n\n${message}\n\n${buttonTexts}\n\nEnter number (1-${buttons.length}):`
        : `${title}\n\n${buttonTexts}\n\nEnter number (1-${buttons.length}):`;

      const response = window.prompt(promptMessage);
      if (response) {
        const index = parseInt(response, 10) - 1;
        if (index >= 0 && index < buttons.length) {
          const button = buttons[index];
          if (button.onPress) {
            button.onPress();
          }
        }
      }
    }
  }

  /**
   * Shows a simple alert with title and message
   */
  static show(title: string, message: string): void {
    this.alert(title, message);
  }

  /**
   * Shows an error alert
   */
  static error(title: string = '오류', message: string): void {
    this.alert(title, message);
  }

  /**
   * Shows a success alert
   */
  static success(title: string = '성공', message: string): void {
    this.alert(title, message);
  }

  /**
   * Shows a confirmation dialog
   */
  static confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    this.alert(
      title,
      message,
      [
        { text: '확인', onPress: onConfirm },
        { text: '취소', onPress: onCancel, style: 'cancel' },
      ]
    );
  }
}

export const Alert = AlertUtil;