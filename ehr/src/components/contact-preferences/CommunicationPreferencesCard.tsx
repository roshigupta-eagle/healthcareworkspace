import React from 'react';

export type CommunicationPreferences = {
  preferredMethod?: string;
  bestTime?: string;
  okToLeaveVoicemail?: boolean;
  okToSMS?: boolean;
  emailAllowed?: boolean;
  marketingAllowed?: boolean;
  language?: string;
  interpreterRequired?: boolean;
  doNotContact?: boolean;
};

export default function CommunicationPreferencesCard({ preferences }: { preferences: CommunicationPreferences }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#121A2D]">Communication Preferences</h4>
        <button className="text-sm text-teal-600">Edit</button>
      </div>

      <div className="mt-3 text-sm text-gray-700 space-y-2">
        <div className="flex justify-between"><div>Preferred method</div><div className="font-medium">{preferences.preferredMethod}</div></div>
        <div className="flex justify-between"><div>Best time to contact</div><div className="font-medium">{preferences.bestTime || 'Anytime'}</div></div>
        <div className="flex justify-between"><div>OK to leave voicemail</div><div className="font-medium">{preferences.okToLeaveVoicemail ? 'Yes' : 'No'}</div></div>
        <div className="flex justify-between"><div>OK to send SMS</div><div className="font-medium">{preferences.okToSMS ? 'Yes' : 'No'}</div></div>
        <div className="flex justify-between"><div>Email allowed</div><div className="font-medium">{preferences.emailAllowed ? 'Yes' : 'No'}</div></div>
        <div className="flex justify-between"><div>Marketing allowed</div><div className="font-medium">{preferences.marketingAllowed ? 'Yes' : 'No'}</div></div>
        <div className="flex justify-between"><div>Language</div><div className="font-medium">{preferences.language}</div></div>
        <div className="flex justify-between"><div>Interpreter required</div><div className="font-medium">{preferences.interpreterRequired ? 'Yes' : 'No'}</div></div>
        <div className="flex justify-between"><div>Do not contact</div><div className="font-medium">{preferences.doNotContact ? 'Yes' : 'No'}</div></div>
      </div>
    </div>
  );
}
