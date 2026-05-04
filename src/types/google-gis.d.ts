interface GisCredentialResponse {
  credential: string;
  select_by: string;
  client_id: string;
}

interface GisPromptNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
  getDismissedReason(): string;
}

interface GisIdConfiguration {
  client_id: string;
  callback: (response: GisCredentialResponse) => void;
  auto_select?: boolean;
  ux_mode?: 'popup' | 'redirect';
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface Window {
  google: {
    accounts: {
      id: {
        initialize(config: GisIdConfiguration): void;
        prompt(callback?: (notification: GisPromptNotification) => void): void;
        cancel(): void;
        renderButton(element: HTMLElement, options: object): void;
      };
    };
  };
}
