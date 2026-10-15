export type CommunicationHostEvent =
  | { readonly type: 'messageAccepted'; readonly messageId: string; readonly conversationId: string }
  | { readonly type: 'conversationSelected'; readonly conversationId: string }
  | { readonly type: 'navigationRequested'; readonly target: string; readonly id?: string }
  | { readonly type: 'draftStateChanged'; readonly state: 'empty' | 'dirty' | 'saved' | 'failed' };

export type CommunicationHostContract = {
  readonly apiBasePath: string;
  readonly launchContext: {
    readonly patientId?: string;
    readonly encounterId?: string;
    readonly appointmentId?: string;
    readonly sourceResource?: { readonly type: string; readonly id: string; readonly version?: string };
  };
  readonly locale: 'en' | 'fr';
  readonly density?: 'comfortable' | 'compact';
  readonly capabilities: readonly string[];
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly navigate: (request: { readonly target: string; readonly id?: string }) => void;
  readonly emit: (event: CommunicationHostEvent) => void;
};

export const createDefaultHostContract = (): CommunicationHostContract => ({
  apiBasePath: '/api/communication/v1',
  launchContext: {},
  locale: 'en',
  density: 'comfortable',
  capabilities: ['communication.read', 'communication.write'],
  featureFlags: {},
  navigate: () => undefined,
  emit: () => undefined,
});
