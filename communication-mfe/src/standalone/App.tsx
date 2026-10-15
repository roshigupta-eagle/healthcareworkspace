import { CommunicationHub } from '../exposes/CommunicationHub';
import { createDefaultHostContract } from '../contracts/hostContract';

const host = createDefaultHostContract();

export function App() {
  return <CommunicationHub host={host} />;
}
