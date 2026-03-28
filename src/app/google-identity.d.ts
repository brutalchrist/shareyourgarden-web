interface GoogleCodeResponse {
  code?: string;
}

interface GoogleCodeError {
  message?: string;
}

interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode?: 'popup' | 'redirect';
  callback: (response: GoogleCodeResponse) => void;
  error_callback?: (error: GoogleCodeError) => void;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleAccountsOAuth2 {
  initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOAuth2;
}

interface GoogleIdentity {
  accounts: GoogleAccounts;
}

interface Window {
  google?: GoogleIdentity;
}

declare const google: GoogleIdentity;
