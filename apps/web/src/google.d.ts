declare namespace google.accounts.id {
  function initialize(config: {
    client_id: string;
    callback: (response: { credential?: string; select_by?: string }) => void;
  }): void;

  function renderButton(
    element: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      width?: number;
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    }
  ): void;

  function prompt(): void;
}
