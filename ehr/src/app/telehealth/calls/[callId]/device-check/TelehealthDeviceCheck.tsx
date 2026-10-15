'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import './telehealth-device-check.css';

type CheckState = 'not-run' | 'checking' | 'ready' | 'blocked' | 'unsupported';
type DeviceAttempt = { state: CheckState; detail?: string; inputLevel?: number | null };
type DeviceOption = { id: string; label: string };
type DeviceInventory = { microphones: DeviceOption[]; cameras: DeviceOption[]; speakers: DeviceOption[] };
type Result = {
  microphone: CheckState;
  camera: CheckState;
  speaker: CheckState;
  network: CheckState;
  browser: CheckState;
  message: string;
};
type BrowserWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
type BrowserNavigator = Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } };
type SinkAudio = HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };

const DEVICE_CHECK_TIMEOUT_MS = 15_000;
const CAMERA_PREVIEW_MS = 10_000;
const EMPTY_DEVICES: DeviceInventory = { microphones: [], cameras: [], speakers: [] };

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'DEVICE_CHECK_TIMEOUT') return 'The browser did not answer the permission request in time. You can try again when you are ready.';
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permission was not granted. Change browser permissions and try again when you are ready.';
  if (name === 'NotFoundError') return 'No compatible device was found. Connect a microphone or camera and try again.';
  if (name === 'NotReadableError') return 'A device is busy or unavailable. Close another app using it and try again.';
  return 'The browser could not complete this device check.';
}

function deviceConstraint(deviceId: string): boolean | MediaTrackConstraints {
  return deviceId ? { deviceId: { exact: deviceId } } : true;
}

function hasMediaSupport() {
  const mediaDevices = (navigator as unknown as { mediaDevices?: { getUserMedia?: unknown; enumerateDevices?: unknown } }).mediaDevices;
  return typeof mediaDevices?.getUserMedia === 'function' && typeof mediaDevices.enumerateDevices === 'function';
}

async function requestLocalStream(constraints: MediaStreamConstraints) {
  let timedOut = false;
  let timeoutId: number | undefined;
  const streamPromise = navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    if (timedOut) stream.getTracks().forEach((track) => track.stop());
    return stream;
  });
  const timeoutPromise = new Promise<MediaStream>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      timedOut = true;
      reject(new Error('DEVICE_CHECK_TIMEOUT'));
    }, DEVICE_CHECK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([streamPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

async function sampleInputLevel(stream: MediaStream) {
  const AudioContextConstructor = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
  if (!AudioContextConstructor || stream.getAudioTracks().length === 0) return null;
  const context = new AudioContextConstructor();
  const analyser = context.createAnalyser();
  const source = context.createMediaStreamSource(stream);
  const samples = new Uint8Array(analyser.fftSize);
  try {
    source.connect(analyser);
    await context.resume();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
    analyser.getByteTimeDomainData(samples);
    const peak = samples.reduce((maximum, value) => Math.max(maximum, Math.abs(value - 128)), 0);
    return Math.min(100, Math.round((peak / 128) * 100));
  } catch {
    return null;
  } finally {
    try {
      source.disconnect();
    } catch {
      // The local analyser may already be disconnected by the browser.
    }
    try {
      await context.close();
    } catch {
      // A failed teardown must not turn a completed local device check into a false failure.
    }
  }
}

async function checkLocalDevice(constraints: MediaStreamConstraints): Promise<DeviceAttempt> {
  try {
    const stream = await requestLocalStream(constraints);
    const hasExpectedTrack = constraints.audio ? stream.getAudioTracks().length > 0 : stream.getVideoTracks().length > 0;
    const inputLevel = constraints.audio ? await sampleInputLevel(stream) : null;
    stream.getTracks().forEach((track) => track.stop());
    return hasExpectedTrack ? { state: 'ready', inputLevel } : { state: 'blocked', detail: 'The browser did not expose the expected local media track.' };
  } catch (error) {
    return { state: 'blocked', detail: errorMessage(error) };
  }
}

function describeBrowser(): { state: CheckState; detail: string } {
  const secure = window.isSecureContext;
  const media = hasMediaSupport();
  if (!secure || !media) return { state: 'unsupported', detail: !secure ? 'A secure browser context is required for device access.' : 'This browser does not expose the required media-device APIs.' };
  return { state: 'ready', detail: `Secure context and local media APIs are available in ${navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Edg/') ? 'Microsoft Edge' : navigator.userAgent.includes('Chrome') ? 'Chrome or Chromium' : 'this browser'}.` };
}

function describeNetwork(): { state: CheckState; detail: string } {
  const connection = (navigator as BrowserNavigator).connection;
  if (!navigator.onLine) return { state: 'blocked', detail: 'The browser reports that it is offline. This page did not probe a clinical media path.' };
  const details = [connection?.effectiveType && `connection type ${connection.effectiveType}`, connection?.downlink && `reported downlink ${connection.downlink} Mbps`, connection?.rtt && `reported RTT ${connection.rtt} ms`, connection?.saveData && 'data saver enabled'].filter(Boolean);
  return { state: 'ready', detail: `The browser reports online${details.length ? ` (${details.join(', ')})` : ''}. This is a local diagnostic, not a call-quality measurement.` };
}

function makeToneUrl() {
  const sampleRate = 8_000;
  const durationSeconds = 0.3;
  const sampleCount = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  write(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 250, (sampleCount - index) / 250);
    view.setInt16(44 + index * 2, Math.round(Math.sin((2 * Math.PI * 660 * index) / sampleRate) * envelope * 12_000), true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function Status({ value }: { value: CheckState }) {
  const labels: Record<CheckState, string> = { 'not-run': 'Not checked', checking: 'Checking', ready: 'Ready', blocked: 'Needs attention', unsupported: 'Unsupported' };
  return <span className={`telehealth-device-status ${value}`}>{labels[value]}</span>;
}

function DeviceSelect({ label, value, devices, onChange, unavailable }: { label: string; value: string; devices: DeviceOption[]; onChange: (value: string) => void; unavailable: string }) {
  return <label className="telehealth-device-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={devices.length === 0}><option value="">{devices.length ? 'Browser default' : unavailable}</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}</select></label>;
}

export default function TelehealthDeviceCheck({ callId, returnHref }: { callId: string; returnHref: string }) {
  const [result, setResult] = useState<Result>({ microphone: 'not-run', camera: 'not-run', speaker: 'not-run', network: 'not-run', browser: 'not-run', message: 'No browser permission has been requested.' });
  const [devices, setDevices] = useState<DeviceInventory>(EMPTY_DEVICES);
  const [microphoneId, setMicrophoneId] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [speakerId, setSpeakerId] = useState('');
  const [inputLevel, setInputLevel] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('Camera preview is off.');
  const previewStream = useRef<MediaStream | null>(null);
  const previewTimer = useRef<number | null>(null);
  const previewVideo = useRef<HTMLVideoElement | null>(null);
  const mounted = useRef(true);

  const stopPreview = useCallback((announce = true) => {
    if (previewTimer.current !== null) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    previewStream.current?.getTracks().forEach((track) => track.stop());
    previewStream.current = null;
    if (previewVideo.current) previewVideo.current.srcObject = null;
    if (announce) {
      setPreviewing(false);
      setPreviewMessage('Camera preview stopped. No local camera track remains active.');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopPreview(false);
    };
  }, [stopPreview]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return EMPTY_DEVICES;
    const available = await navigator.mediaDevices.enumerateDevices();
    const toOptions = (kind: MediaDeviceKind, fallback: string) => available.filter((device) => device.kind === kind).map((device, index) => ({ id: device.deviceId, label: device.label || `${fallback} ${index + 1}` }));
    const inventory = { microphones: toOptions('audioinput', 'Microphone'), cameras: toOptions('videoinput', 'Camera'), speakers: toOptions('audiooutput', 'Speaker') };
    const saved = (type: 'microphone' | 'camera' | 'speaker') => {
      try {
        return window.sessionStorage.getItem(`roshi.telehealth.device.${type}`) || '';
      } catch {
        return '';
      }
    };
    setDevices(inventory);
    setMicrophoneId((current) => inventory.microphones.some((device) => device.id === current) ? current : inventory.microphones.some((device) => device.id === saved('microphone')) ? saved('microphone') : '');
    setCameraId((current) => inventory.cameras.some((device) => device.id === current) ? current : inventory.cameras.some((device) => device.id === saved('camera')) ? saved('camera') : '');
    setSpeakerId((current) => inventory.speakers.some((device) => device.id === current) ? current : inventory.speakers.some((device) => device.id === saved('speaker')) ? saved('speaker') : '');
    return inventory;
  }, []);

  const chooseDevice = (type: 'microphone' | 'camera' | 'speaker', value: string) => {
    try {
      window.sessionStorage.setItem(`roshi.telehealth.device.${type}`, value);
    } catch {
      // Session preference is optional and never leaves the browser.
    }
    if (type === 'microphone') setMicrophoneId(value);
    if (type === 'camera') setCameraId(value);
    if (type === 'speaker') setSpeakerId(value);
  };

  async function runCheck() {
    const browser = describeBrowser();
    const network = describeNetwork();
    if (!hasMediaSupport()) {
      setResult({ microphone: 'unsupported', camera: 'unsupported', speaker: 'unsupported', browser: browser.state, network: network.state, message: `${browser.detail} ${network.detail}` });
      return;
    }
    setResult((current) => ({ ...current, microphone: 'checking', camera: 'not-run', browser: browser.state, network: network.state, message: 'Checking microphone permission and a local audio track...' }));
    const microphone = await checkLocalDevice({ audio: deviceConstraint(microphoneId), video: false });
    if (!mounted.current) return;
    setInputLevel(microphone.inputLevel ?? null);
    setResult((current) => ({ ...current, microphone: microphone.state, camera: 'checking', browser: browser.state, network: network.state, message: microphone.state === 'ready' ? 'Microphone check complete. Checking the optional camera separately...' : microphone.detail || 'Microphone needs attention. Checking the optional camera separately...' }));
    const camera = await checkLocalDevice({ audio: false, video: deviceConstraint(cameraId) });
    if (!mounted.current) return;
    let inventory = EMPTY_DEVICES;
    let inventoryUnavailable = false;
    try {
      inventory = await refreshDevices();
    } catch {
      inventoryUnavailable = true;
    }
    if (!mounted.current) return;
    const readyMessage = microphone.state === 'ready'
      ? camera.state === 'ready'
        ? 'Microphone and optional camera are available locally. No media was transmitted or recorded.'
        : `Microphone is available. Camera is optional and needs attention. ${camera.detail || ''}`.trim()
      : `${microphone.detail || 'Microphone needs attention.'} ${camera.state === 'ready' ? 'The optional camera is available.' : camera.detail || ''}`.trim();
    setResult({ microphone: microphone.state, camera: camera.state, speaker: inventory.speakers.length ? 'not-run' : 'unsupported', browser: browser.state, network: network.state, message: `${readyMessage}${inventoryUnavailable ? ' The browser did not return a local device list; retry the check to try device selection again.' : ''}` });
  }

  async function startPreview() {
    if (!hasMediaSupport()) {
      setPreviewMessage('This browser cannot start a local camera preview.');
      return;
    }
    stopPreview(false);
    setPreviewMessage('Requesting selected camera access for a brief local preview...');
    try {
      const stream = await requestLocalStream({ audio: false, video: deviceConstraint(cameraId) });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      previewStream.current = stream;
      if (previewVideo.current) {
        previewVideo.current.srcObject = stream;
        await previewVideo.current.play();
      }
      setPreviewing(true);
      setPreviewMessage(`Preview is local and will stop automatically after ${CAMERA_PREVIEW_MS / 1000} seconds.`);
      previewTimer.current = window.setTimeout(() => stopPreview(), CAMERA_PREVIEW_MS);
    } catch (error) {
      if (!mounted.current) return;
      stopPreview(false);
      setPreviewing(false);
      setPreviewMessage(errorMessage(error));
    }
  }

  async function playSpeakerTone() {
    const audio = new Audio() as SinkAudio;
    const toneUrl = makeToneUrl();
    try {
      if (speakerId) {
        if (!audio.setSinkId) throw new Error('SPEAKER_SELECTION_UNSUPPORTED');
        await audio.setSinkId(speakerId);
      }
      audio.src = toneUrl;
      await audio.play();
      setResult((current) => ({ ...current, speaker: 'ready', message: speakerId ? 'A short local speaker test tone is playing through the selected output.' : 'A short local speaker test tone is playing through the browser default output.' }));
      audio.onended = () => URL.revokeObjectURL(toneUrl);
      window.setTimeout(() => URL.revokeObjectURL(toneUrl), 2_000);
    } catch (error) {
      URL.revokeObjectURL(toneUrl);
      const unsupported = error instanceof Error && error.message === 'SPEAKER_SELECTION_UNSUPPORTED';
      setResult((current) => ({ ...current, speaker: unsupported ? 'unsupported' : 'blocked', message: unsupported ? 'This browser does not allow programmatic speaker selection. Use the operating system or browser output control, then retry the default tone.' : 'The browser could not play the local speaker test tone.' }));
    }
  }

  const checking = result.microphone === 'checking' || result.camera === 'checking';

  return <main className="telehealth-device-page" aria-labelledby="telehealth-device-title">
    <section className="telehealth-device-card">
      <span className="telehealth-device-eyebrow">Roshi telehealth readiness</span>
      <h1 id="telehealth-device-title">Device check</h1>
      <p className="telehealth-device-subtitle">Call reference: <code>{callId}</code></p>
      <div className="telehealth-device-warning"><strong>Media sessions are not configured in this environment.</strong><span>This local preflight cannot place, join, record, or transmit a clinical call. Device identifiers remain in this browser session and are never sent to the server.</span></div>
      <div className="telehealth-device-grid">
        <article><div><strong>Microphone</strong><span>Permission, selected input, and short local level sample</span></div><Status value={result.microphone} /></article>
        <article><div><strong>Camera (optional)</strong><span>Permission, selected input, and brief local preview</span></div><Status value={result.camera} /></article>
        <article><div><strong>Speaker</strong><span>Optional local test tone and output selection</span></div><Status value={result.speaker} /></article>
        <article><div><strong>Network</strong><span>Browser-reported diagnostic only</span></div><Status value={result.network} /></article>
        <article><div><strong>Browser compatibility</strong><span>Secure context and media-device API availability</span></div><Status value={result.browser} /></article>
        <article><div><strong>Permissions</strong><span>Requested only after you select the check button</span></div><Status value={checking ? 'checking' : result.microphone === 'ready' || result.camera === 'ready' ? 'ready' : result.microphone === 'blocked' || result.camera === 'blocked' ? 'blocked' : 'not-run'} /></article>
      </div>
      <button type="button" className="telehealth-device-button" onClick={() => void runCheck()} disabled={checking}>{checking ? 'Checking devices...' : 'Check microphone and camera'}</button>
      <div className="telehealth-device-controls" aria-label="Local device selection and tests">
        <DeviceSelect label="Microphone" value={microphoneId} devices={devices.microphones} onChange={(value) => chooseDevice('microphone', value)} unavailable="Run a check to list microphones" />
        <DeviceSelect label="Camera" value={cameraId} devices={devices.cameras} onChange={(value) => chooseDevice('camera', value)} unavailable="Run a check to list cameras" />
        <DeviceSelect label="Speaker" value={speakerId} devices={devices.speakers} onChange={(value) => chooseDevice('speaker', value)} unavailable="Run a check to list speakers" />
      </div>
      <div className="telehealth-device-meter"><div><strong>Microphone input level</strong><span>One short local sample; silence can still be a healthy microphone.</span></div><meter min="0" max="100" value={inputLevel ?? 0} aria-label={inputLevel === null ? 'Microphone input level not sampled' : `Microphone input level ${inputLevel} percent`} /><output>{inputLevel === null ? 'Not sampled' : `${inputLevel}%`}</output></div>
      <section className="telehealth-device-preview" aria-labelledby="telehealth-camera-preview-title"><div><h2 id="telehealth-camera-preview-title">Optional camera preview</h2><p>{previewMessage}</p></div><div className="telehealth-device-preview-frame"><video ref={previewVideo} hidden={!previewing} muted playsInline aria-label="Local camera preview" /><span hidden={previewing}>Camera preview is off.</span></div><div className="telehealth-device-preview-actions"><button type="button" onClick={() => void startPreview()} disabled={previewing || checking}>Preview camera for 10 seconds</button>{previewing ? <button type="button" className="secondary" onClick={() => stopPreview()}>Stop preview</button> : null}</div></section>
      <button type="button" className="telehealth-device-speaker-button" onClick={() => void playSpeakerTone()} disabled={checking}>Play speaker test tone</button>
      <section className="telehealth-device-diagnostics" aria-labelledby="telehealth-device-diagnostics-title"><h2 id="telehealth-device-diagnostics-title">Local diagnostics</h2><p><strong>Browser:</strong> {result.browser === 'not-run' ? 'Run a check to assess local browser support.' : describeBrowser().detail}</p><p><strong>Network:</strong> {result.network === 'not-run' ? 'Run a check to read browser-reported connectivity.' : describeNetwork().detail}</p></section>
      <p className="telehealth-device-message" role="status" aria-live="polite">{result.message}</p>
      <Link className="telehealth-device-back" href={returnHref}>Return to call history</Link>
    </section>
  </main>;
}
