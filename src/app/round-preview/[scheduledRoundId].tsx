import { PlaceholderScreen } from '@/screens/PlaceholderScreen';

export default function RoundPreviewRoute() {
  return (
    <PlaceholderScreen
      topInset={false}
      title="Round Preview"
      description="The upcoming round without the configuration complexity."
      planned={['Course, time, players, RSVP', 'Teams and games summary', 'Start Round (admins)']}
    />
  );
}
