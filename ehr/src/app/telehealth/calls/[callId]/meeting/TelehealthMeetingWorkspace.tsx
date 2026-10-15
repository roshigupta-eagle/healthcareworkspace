'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CameraOff, ChevronLeft, CircleEllipsis, Expand, Mic, MicOff, MonitorUp, PhoneOff, Settings, Signal, Users, Video } from 'lucide-react';
import { ConnectionQuality, ConnectionState, Room, RoomEvent, Track, type Participant, type Track as LiveKitTrack } from 'livekit-client';
import './telehealth-meeting.css';

type JoinEnvelope = { data?: { join?: { serverUrl: string; token: string } }; detail?: string };
type MeetingContext = {
  eligible: boolean;
  code?: string;
  detail?: string;
  localDemoAllowed?: boolean;
  patient?: { id: string; name: string };
  clinician?: { id: string; name: string; role: string };
  visit?: { label: string };
};
type MeetingContextEnvelope = { data?: MeetingContext; detail?: string };
type Props = { callId: string; returnHref: string; showDevelopmentBadge: boolean };
type DeviceState = { microphones: MediaDeviceInfo[]; cameras: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] };

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT';
}

function connectionCopy(state: ConnectionState, remoteMediaReady: boolean) {
  if (state === ConnectionState.Connected && remoteMediaReady) return 'Connected';
  if (state === ConnectionState.Connected) return 'Joined — waiting for remote media';
  if (state === ConnectionState.Reconnecting) return 'Reconnecting…';
  if (state === ConnectionState.Connecting) return 'Preparing secure media…';
  return 'Ready to join';
}

function qualityCopy(quality: ConnectionQuality) {
  if (quality === ConnectionQuality.Excellent) return 'Excellent';
  if (quality === ConnectionQuality.Good) return 'Good';
  if (quality === ConnectionQuality.Poor) return 'Limited';
  if (quality === ConnectionQuality.Lost) return 'Reconnecting';
  return 'Checking';
}

function savedDevice(kind: 'microphone' | 'camera' | 'speaker') {
  try {
    return window.sessionStorage.getItem(`roshi.telehealth.device.${kind}`) || '';
  } catch {
    return '';
  }
}

async function applySavedDevices(room: Room) {
  const preferences: Array<[MediaDeviceKind, string]> = [
    ['audioinput', savedDevice('microphone')],
    ['videoinput', savedDevice('camera')],
    ['audiooutput', savedDevice('speaker')],
  ];
  await Promise.all(preferences.filter(([, deviceId]) => Boolean(deviceId)).map(async ([kind, deviceId]) => {
    try {
      await room.switchActiveDevice(kind, deviceId);
    } catch {
      // A saved browser-session device can disappear between preflight and join.
    }
  }));
}

function VideoTile({ active, isLocal, label, role, track }: { active: boolean; isLocal: boolean; label: string; role: string; track: LiveKitTrack | null }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  return <div className={`meeting-video-tile${active ? ' is-speaking' : ''}`}>
    {track ? <video ref={ref} autoPlay muted={isLocal} playsInline className="meeting-video" aria-label={`${label} video`} /> : <div className="meeting-camera-placeholder"><div className="meeting-avatar">{initials(label)}</div><strong>{label}</strong><span>{isLocal ? 'Camera is off' : 'Waiting for remote media'}</span></div>}
    <span className="meeting-nameplate">{isLocal ? 'You' : label}<small>{role}</small></span>
    {!track ? <span className="meeting-camera-status"><CameraOff size={14} /> Camera off</span> : null}
  </div>;
}

function AudioTrack({ track }: { track: LiveKitTrack | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  return track ? <audio ref={ref} autoPlay /> : null;
}

export default function TelehealthMeetingWorkspace({ callId, returnHref, showDevelopmentBadge }: Props) {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || undefined;
  const requestedLocalGuest = searchParams.get('localGuest') === 'true';
  const roomRef = useRef<Room | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const meetingContextKey = `${callId}:${patientId || ''}`;
  const [meetingResponse, setMeetingResponse] = useState<{ key: string; meeting: MeetingContext | null }>({ key: '', meeting: null });
  const meeting = meetingResponse.key === meetingContextKey ? meetingResponse.meeting : null;
  const contextLoading = meetingResponse.key !== meetingContextKey;
  const [connection, setConnection] = useState(ConnectionState.Disconnected);
  const [localVideo, setLocalVideo] = useState<LiveKitTrack | null>(null);
  const [remoteVideo, setRemoteVideo] = useState<LiveKitTrack | null>(null);
  const [remoteAudio, setRemoteAudio] = useState<LiveKitTrack | null>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [quality, setQuality] = useState(ConnectionQuality.Unknown);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [devices, setDevices] = useState<DeviceState>({ microphones: [], cameras: [], speakers: [] });
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const localGuest = Boolean(meeting?.localDemoAllowed && requestedLocalGuest);
  const localName = localGuest ? meeting?.patient?.name || 'Patient' : meeting?.clinician?.name || 'Clinician';
  const localRole = localGuest ? 'Patient' : meeting?.clinician?.role || 'Clinician';
  const remoteName = localGuest ? meeting?.clinician?.name || 'Clinician' : meeting?.patient?.name || 'Patient';
  const remoteRole = localGuest ? meeting?.clinician?.role || 'Clinician' : 'Patient';
  const remoteMediaReady = Boolean(remoteAudio || remoteVideo);
  const roomConnected = connection === ConnectionState.Connected;
  const mediaConnected = roomConnected && remoteMediaReady;

  const syncRoom = (room: Room) => {
    const remote = Array.from(room.remoteParticipants.values());
    const participant = remote[0];
    const nextRemoteVideo = participant?.getTrackPublication(Track.Source.ScreenShare)?.videoTrack || participant?.getTrackPublication(Track.Source.Camera)?.videoTrack || null;
    const nextRemoteAudio = participant?.getTrackPublication(Track.Source.Microphone)?.track || null;
    setParticipants(remote);
    setRemoteParticipant(participant || null);
    setRemoteVideo(nextRemoteVideo);
    setRemoteAudio(nextRemoteAudio);
    setLocalVideo(room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack || null);
    setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
    setCameraEnabled(room.localParticipant.isCameraEnabled);
    setScreenShareEnabled(room.localParticipant.isScreenShareEnabled);
    if (room.state === ConnectionState.Connected && (nextRemoteAudio || nextRemoteVideo)) setStartedAt((value) => value ?? Date.now());
    if (room.state === ConnectionState.Disconnected) { setStartedAt(null); setElapsed(0); }
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    const contextKey = meetingContextKey;
    void fetch(`/api/communication/v1/calls/${encodeURIComponent(callId)}/meeting-context${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as MeetingContextEnvelope;
        if (!response.ok || !payload.data) throw new Error(payload.detail || 'Telehealth eligibility could not be verified.');
        if (!controller.signal.aborted) setMeetingResponse({ key: contextKey, meeting: payload.data });
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setMeetingResponse({ key: contextKey, meeting: { eligible: false, localDemoAllowed: false, code: 'TELEHEALTH_CONTEXT_UNAVAILABLE', detail: caught instanceof Error ? caught.message : 'Telehealth eligibility could not be verified.' } });
      })
    return () => controller.abort();
  }, [callId, meetingContextKey, patientId]);

  useEffect(() => () => { const room = roomRef.current; roomRef.current = null; if (room) void room.disconnect(); }, []);
  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  async function disconnectRoom(endCall: boolean) {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    setConnection(ConnectionState.Disconnected);
    setLocalVideo(null);
    setRemoteVideo(null);
    setRemoteAudio(null);
    setRemoteParticipant(null);
    setParticipants([]);
    setMicrophoneEnabled(false);
    setCameraEnabled(false);
    setScreenShareEnabled(false);
    if (endCall) {
      try {
        const query = new URLSearchParams();
        if (patientId) query.set('patientId', patientId);
        const response = await fetch(`/api/communication/v1/calls/${encodeURIComponent(callId)}/end${query.size ? `?${query.toString()}` : ''}`, { method: 'POST', cache: 'no-store' });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { detail?: string } | null;
          throw new Error(payload?.detail || 'The call ended locally, but the control plane could not confirm the end state.');
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The call ended locally, but its server state could not be confirmed.');
      }
    }
  }

  async function join() {
    if (!meeting?.eligible) return;
    setJoining(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (patientId) query.set('patientId', patientId);
      if (localGuest) query.set('localGuest', 'true');
      const response = await fetch(`/api/communication/v1/calls/${encodeURIComponent(callId)}/join${query.size ? `?${query.toString()}` : ''}`, { method: 'POST', cache: 'no-store' });
      const payload = await response.json() as JoinEnvelope;
      const grant = payload.data?.join;
      if (!response.ok || !grant) throw new Error(payload.detail || 'The media service did not provide a join grant.');
      const room = new Room();
      room.on(RoomEvent.ConnectionStateChanged, (state) => { setConnection(state); if (state === ConnectionState.Disconnected) syncRoom(room); });
      room.on(RoomEvent.ParticipantConnected, () => syncRoom(room));
      room.on(RoomEvent.ParticipantDisconnected, () => syncRoom(room));
      room.on(RoomEvent.TrackSubscribed, () => syncRoom(room));
      room.on(RoomEvent.TrackUnsubscribed, () => syncRoom(room));
      room.on(RoomEvent.LocalTrackPublished, () => syncRoom(room));
      room.on(RoomEvent.LocalTrackUnpublished, () => syncRoom(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () => syncRoom(room));
      room.on(RoomEvent.ConnectionQualityChanged, (nextQuality) => setQuality(nextQuality));
      roomRef.current = room;
      await room.connect(grant.serverUrl, grant.token);
      await applySavedDevices(room);
      await room.startAudio();
      await room.localParticipant.enableCameraAndMicrophone();
      syncRoom(room);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not connect the call.');
      await disconnectRoom(false);
    } finally {
      setJoining(false);
    }
  }

  async function toggleMicrophone() { const room = roomRef.current; if (!room) return; await room.localParticipant.setMicrophoneEnabled(!microphoneEnabled); syncRoom(room); }
  async function toggleCamera() { const room = roomRef.current; if (!room) return; await room.localParticipant.setCameraEnabled(!cameraEnabled); syncRoom(room); }
  async function toggleScreenShare() { const room = roomRef.current; if (!room) return; try { await room.localParticipant.setScreenShareEnabled(!screenShareEnabled); syncRoom(room); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Screen sharing could not be changed.'); } }
  async function loadDevices() {
    const [microphones, cameras, speakers] = await Promise.all([
      Room.getLocalDevices('audioinput', false),
      Room.getLocalDevices('videoinput', false),
      Room.getLocalDevices('audiooutput', false),
    ]);
    setDevices({ microphones, cameras, speakers });
    setShowDevices(true);
  }
  async function switchDevice(kind: MediaDeviceKind, deviceId: string) { const room = roomRef.current; if (!room || !deviceId) return; await room.switchActiveDevice(kind, deviceId); }
  async function toggleFullscreen() { if (!stageRef.current) return; if (document.fullscreenElement) await document.exitFullscreen(); else await stageRef.current.requestFullscreen(); }

  const timer = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const guestQuery = new URLSearchParams(searchParams.toString());
  guestQuery.set('localGuest', 'true');
  const blocked = !contextLoading && !meeting?.eligible;

  return <main className="telehealth-meeting" aria-labelledby="telehealth-meeting-title">
    <section className="meeting-canvas" ref={stageRef}>
      <header className="meeting-topbar">
        <div className="meeting-visit"><span className="meeting-brand">Roshi Telehealth</span><h1 id="telehealth-meeting-title">{meeting?.visit?.label || 'Telehealth meeting'}<small>{meeting?.eligible ? 'Authorized visit context' : 'Media access requires a verified patient visit'}</small></h1></div>
        <div className="meeting-status"><span className="meeting-timer">{mediaConnected ? timer : '--:--'}</span><span className={`meeting-connection is-${connection.toLowerCase()}`}><Signal size={15} /> {mediaConnected ? `${qualityCopy(quality)} connection` : connectionCopy(connection, remoteMediaReady)}</span><span className="meeting-secure">Media authorization required</span><button type="button" className="meeting-icon-button" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore} aria-label="More meeting options"><CircleEllipsis size={20} /></button></div>
      </header>
      {showDevelopmentBadge && meeting?.localDemoAllowed ? <span className="meeting-dev-badge" title="Explicit synthetic local-development eligibility. Recording and transcription are disabled.">LOCAL DEMO</span> : null}
      {contextLoading ? <div className="meeting-waiting meeting-unavailable"><h2>Checking telehealth eligibility</h2><p>No media credential is requested while the visit context is being verified.</p></div> : null}
      {blocked ? <div className="meeting-waiting meeting-unavailable" role="alert"><h2>Telehealth meeting unavailable</h2><p>{meeting?.detail || 'A verified patient, participant, and visit authorization are required before media access can be granted.'}</p><Link className="meeting-join" href={returnHref}>Return to call details</Link></div> : null}
      {error ? <div className="meeting-error" role="alert"><strong>Connection needs attention</strong><span>{error}</span>{meeting?.eligible ? <button type="button" onClick={() => void join()}>Retry</button> : null}</div> : null}
      {connection === ConnectionState.Reconnecting ? <div className="meeting-reconnect" role="status"><Signal size={24} /><strong>Connection interrupted</strong><span>Trying to reconnect your media session…</span></div> : null}
      {meeting?.eligible && !roomConnected && !joining && !error ? <div className="meeting-waiting"><div className="meeting-avatar large">{initials(remoteName)}</div><h2>{remoteName} has not joined yet</h2><p>Join when you are ready to request browser media permissions.</p><button type="button" className="meeting-join" onClick={() => void join()}>Join visit</button></div> : null}
      {meeting?.eligible && (roomConnected || joining) ? <><section className="meeting-remote-stage" aria-label="Primary participant video"><AudioTrack track={remoteAudio} /><VideoTile active={Boolean(remoteParticipant?.isSpeaking)} isLocal={false} label={remoteName} role={remoteRole} track={remoteVideo} /></section><section className="meeting-local-pip" aria-label="Your video preview"><VideoTile active={false} isLocal label={localName} role={localRole} track={localVideo} /></section></> : null}
      {showMore ? <aside className="meeting-popover meeting-more-menu"><button type="button" onClick={() => void loadDevices()} disabled={!roomConnected}><Settings size={17} /> Device settings</button><button type="button" onClick={() => void toggleFullscreen()}><Expand size={17} /> Full screen</button>{meeting?.eligible ? <button type="button" onClick={() => setShowContext(true)}><Users size={17} /> Visit context</button> : null}<Link href={returnHref}><ChevronLeft size={17} /> Call details</Link></aside> : null}
      <section className="meeting-control-dock" aria-label="Call controls">{roomConnected ? <><button type="button" className={microphoneEnabled ? '' : 'is-muted'} onClick={() => void toggleMicrophone()} aria-label={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={microphoneEnabled}>{microphoneEnabled ? <Mic size={21} /> : <MicOff size={21} />}<span>{microphoneEnabled ? 'Mute' : 'Unmute'}</span></button><button type="button" className={cameraEnabled ? '' : 'is-muted'} onClick={() => void toggleCamera()} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} aria-pressed={cameraEnabled}>{cameraEnabled ? <Video size={21} /> : <CameraOff size={21} />}<span>Camera</span></button><button type="button" className={screenShareEnabled ? 'is-active' : ''} onClick={() => void toggleScreenShare()} aria-label={screenShareEnabled ? 'Stop sharing screen' : 'Share screen'} aria-pressed={screenShareEnabled}><MonitorUp size={21} /><span>{screenShareEnabled ? 'Stop share' : 'Share'}</span></button><button type="button" onClick={() => setShowPeople(true)} aria-label="Participants"><Users size={21} /><span>People</span></button><button type="button" onClick={() => setShowMore((value) => !value)} aria-label="More meeting options"><CircleEllipsis size={21} /><span>More</span></button><button type="button" className="meeting-end" onClick={() => void disconnectRoom(true)} aria-label="End call"><PhoneOff size={21} /><span>End</span></button></> : null}</section>
      {meeting?.localDemoAllowed && !localGuest ? <Link className="meeting-guest-link" href={`/telehealth/calls/${encodeURIComponent(callId)}/meeting?${guestQuery.toString()}`} target="_blank" rel="noreferrer">Open synthetic development participant</Link> : null}
    </section>
    {showPeople ? <aside className="meeting-drawer" aria-label="Participants"><header><div><span>Participants</span><strong>{participants.length + 1} in call</strong></div><button type="button" onClick={() => setShowPeople(false)} aria-label="Close participants">×</button></header><ul><li><span className="participant-avatar">{initials(localName)}</span><div><strong>You</strong><small>{localRole}</small></div><span>{microphoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}</span></li>{participants.map((participant) => <li key={participant.identity}><span className="participant-avatar">{initials(participant.name || 'Participant')}</span><div><strong>{participant.name || 'Participant'}</strong><small>{participant.isSpeaking ? 'Speaking' : participant.connectionQuality}</small></div><span>{participant.isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}</span></li>)}</ul></aside> : null}
    {showDevices ? <aside className="meeting-drawer meeting-device-drawer" aria-label="Device settings"><header><div><span>Device settings</span><strong>Choose active devices</strong></div><button type="button" onClick={() => setShowDevices(false)} aria-label="Close device settings">×</button></header>{([['Microphone', devices.microphones, 'audioinput'], ['Camera', devices.cameras, 'videoinput'], ['Speaker', devices.speakers, 'audiooutput']] as const).map(([label, entries, kind]) => <label key={kind}>{label}<select onChange={(event) => void switchDevice(kind, event.target.value)} defaultValue=""><option value="" disabled>Select device</option>{entries.map((entry) => <option value={entry.deviceId} key={entry.deviceId}>{entry.label || `${label} device`}</option>)}</select></label>)}</aside> : null}
    {showContext && meeting?.eligible ? <aside className="meeting-drawer meeting-context-drawer" aria-label="Visit context"><header><div><span>Visit context</span><strong>{meeting.patient?.name || 'Patient'}</strong></div><button type="button" onClick={() => setShowContext(false)} aria-label="Close visit context">×</button></header><dl><div><dt>Visit</dt><dd>{meeting.visit?.label || 'Authorized telehealth visit'}</dd></div><div><dt>Call type</dt><dd>Live video consultation</dd></div><div><dt>Safety</dt><dd>Verify identity before discussing clinical information.</dd></div></dl></aside> : null}
  </main>;
}
