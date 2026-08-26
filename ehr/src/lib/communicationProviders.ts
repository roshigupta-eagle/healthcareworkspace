export type CommunicationProviderStatus = {
  available: boolean;
  reason?: string;
};

export interface EmailCommunicationProvider {
  status(): CommunicationProviderStatus;
}

export interface TelephonyCommunicationProvider {
  status(): CommunicationProviderStatus;
}

const unavailableEmailProvider: EmailCommunicationProvider = {
  status: () => ({ available: false, reason: 'No approved email delivery provider is configured.' }),
};

const unavailableTelephonyProvider: TelephonyCommunicationProvider = {
  status: () => ({ available: false, reason: 'No approved telephony or voicemail provider is configured.' }),
};

export function getCommunicationProviderStatus() {
  return {
    email: unavailableEmailProvider.status(),
    telephony: unavailableTelephonyProvider.status(),
  };
}
